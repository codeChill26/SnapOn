const nodemailer = require('nodemailer');
const dns = require('dns');

// Render may resolve Gmail SMTP to IPv6 first, while the container has no IPv6
// SMTP route. Prefer IPv4 globally and force IPv4 in the transport.
dns.setDefaultResultOrder('ipv4first');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = 587;

function createTransporter() {
  const configuredPort = parseInt(process.env.SMTP_PORT || `${SMTP_PORT}`, 10);
  if (configuredPort !== SMTP_PORT) {
    console.warn(`[EMAIL SERVICE] Ignoring SMTP_PORT=${configuredPort}; using STARTTLS port ${SMTP_PORT}`);
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || '10000', 10),
    greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT || '10000', 10),
    socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || '15000', 10),
    family: 4,
    tls: {
      rejectUnauthorized: false,
      servername: SMTP_HOST,
    },
  });
}

function isEmailDebugOtpEnabled() {
  return process.env.EMAIL_DEBUG_OTP === 'true';
}

async function sendVerificationEmail(toEmail, fullName, token) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@snapon.vn',
    to: toEmail,
    subject: `[SnapOn] Ma xac thuc email cua ban: ${token}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F4F5F7; padding: 40px 0;">
        <table align="center" width="100%" style="max-width: 600px; background: #FFFFFF; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 32px; text-align: center;">
              <h1 style="color: #FF6600; margin: 0;">Snap<span style="color: #090E17;">On</span></h1>
              <p style="color: #4A5568;">Chao ${fullName || 'ban'}, day la ma xac thuc email cua ban:</p>
              <div style="display: inline-block; margin: 24px 0; padding: 16px 32px; border: 2px solid #FFE0D1; border-radius: 8px; background: #FFF5F0; color: #FF6600; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">
                ${token}
              </div>
              <p style="color: #E53E3E; font-size: 13px;">Ma nay co hieu luc trong 15 phut. Vui long khong chia se ma nay.</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    return {
      success: false,
      error,
      message: 'Khong the gui email xac thuc luc nay. Vui long thu lai sau.',
    };
  }
}

module.exports = {
  sendVerificationEmail,
  isEmailDebugOtpEnabled,
};
