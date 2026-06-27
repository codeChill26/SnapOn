const nodemailer = require('nodemailer');
const dns = require('dns');

// Render/runtime may resolve Gmail SMTP to IPv6 first, while the container has no
// IPv6 route. Prefer IPv4 so smtp.gmail.com connects to an A record.
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || '10000', 10),
  greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT || '10000', 10),
  socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || '15000', 10),
  family: parseInt(process.env.SMTP_FAMILY || '4', 10),
});

function isEmailDebugOtpEnabled() {
  return process.env.EMAIL_DEBUG_OTP === 'true';
}

/**
 * Sends a verification email to a user with a 6-digit OTP code.
 * @param {string} toEmail 
 * @param {string} fullName 
 * @param {string} token 
 */
async function sendVerificationEmail(toEmail, fullName, token) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"SnapOn App" <noreply@snapon.vn>',
    to: toEmail,
    subject: `[SnapOn] Xác thực địa chỉ email của bạn - Mã: ${token}`,
    html: `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F5F7; margin: 0; padding: 40px 0; width: 100%;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; margin: 0 auto;">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Snap<span style="color: #090E17;">On</span></h1>
              <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Kết nối việc làm, dễ dàng hơn</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; color: #2D3748; line-height: 1.6; font-size: 15px;">
              <h3 style="color: #090E17; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; text-align: center;">Xác thực địa chỉ Email</h3>
              <p style="margin: 0 0 20px 0; text-align: center; color: #4A5568;">Chào bạn, cảm ơn bạn đã tham gia SnapOn. Hãy sử dụng mã xác thực OTP dưới đây để hoàn tất quá trình kích hoạt tài khoản:</p>
              
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 30px auto; background-color: #FFF5F0; border: 2px solid #FFE0D1; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 36px; text-align: center; font-size: 32px; font-weight: 800; color: #FF6600; letter-spacing: 8px; font-family: monospace;">
                    ${token}
                  </td>
                </tr>
              </table>
              
              <p style="color: #E53E3E; font-size: 13px; font-weight: 600; text-align: center; margin: 20px 0 0 0;">
                ⚠️ Mã xác thực này có hiệu lực trong vòng 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai khác.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; text-align: center; border-top: 1px solid #EDF2F7; background-color: #FAFAFA;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #718096; font-weight: 500;">Đây là email tự động, vui lòng không trả lời email này.</p>
              <p style="margin: 0; font-size: 12px; color: #A0AEC0;">&copy; 2026 SnapOn. Mọi quyền được bảo lưu.</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [EMAIL SERVICE] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [EMAIL SERVICE] Error sending email:', error);
    throw new Error(`Gửi email xác thực thất bại: ${error.message}`);
  }
}

module.exports = {
  sendVerificationEmail,
  isEmailDebugOtpEnabled,
};
