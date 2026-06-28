function isEmailDebugOtpEnabled() {
  const isDev = process.env.NODE_ENV !== 'production' && process.env.AUTH_MODE === 'dev';
  return isDev && process.env.EMAIL_DEBUG_OTP === 'true';
}

async function sendVerificationEmail(to, name, token) {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    const payload = {
      sender: { name: 'SnapOn App', email: 'tuankietpro04@gmail.com' },
      to: [
        {
          email: to,
          name: name || ''
        }
      ],
      subject: `[SnapOn] Mã xác thực email của bạn: ${token}`,
      htmlContent: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8F9FA; padding: 50px 0; margin: 0; width: 100%;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05); border: 1px solid #EAEAEA;">
            <!-- Top Gradient Accent Bar -->
            <tr>
              <td height="6" style="background: linear-gradient(90deg, #FF9900 0%, #FF6600 50%, #FF3300 100%);"></td>
            </tr>
            
            <!-- Logo Section -->
            <tr>
              <td style="padding: 40px 40px 20px 40px; text-align: center;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Snap<span style="color: #090E17;">On</span></h1>
              </td>
            </tr>

            <!-- Content Body -->
            <tr>
              <td style="padding: 20px 40px 40px 40px;">
                <p style="color: #1F2937; font-size: 16px; line-height: 24px; font-weight: bold; margin: 0 0 16px 0;">
                  Xin chào ${name || 'bạn'},
                </p>
                <p style="color: #4B5563; font-size: 15px; line-height: 24px; margin: 0 0 32px 0;">
                  Chào mừng bạn đến với SnapOn. Đây là mã xác thực email (OTP) của bạn. Vui lòng nhập mã này vào ứng dụng để tiếp tục quá trình xác minh tài khoản:
                </p>

                <!-- OTP Code Display -->
                <div style="text-align: center; margin: 32px 0;">
                  <div style="display: inline-block; padding: 20px 40px; background-color: #FFF5F0; border: 1.5px dashed #FF6600; border-radius: 12px; text-align: center; box-shadow: inset 0 2px 4px rgba(255, 102, 0, 0.02);">
                    <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #C2410C; margin-bottom: 8px;">Mã xác thực OTP</span>
                    <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; color: #FF6600;">${token}</span>
                  </div>
                </div>

                <!-- Warning Notice -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5F5; border-radius: 8px; margin: 32px 0 0 0;">
                  <tr>
                    <td style="padding: 12px 16px; text-align: center; color: #DC2626; font-size: 13px; font-weight: 500; line-height: 18px;">
                      ⚠️ Mã xác thực này có hiệu lực trong vòng <strong>15 phút</strong>. Vui lòng <strong>không chia sẻ</strong> mã này với bất kỳ ai để bảo vệ tài khoản của bạn.
                    </td>
                  </tr>
                </table>

                <!-- Divider -->
                <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 40px 0 24px 0;" />

                <!-- Footer Text -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="text-align: center; color: #9CA3AF; font-size: 12px; line-height: 20px;">
                      Đây là email tự động từ hệ thống. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.<br />
                      &copy; 2026 SnapOn App. Mọi quyền được bảo lưu.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = await response.text();
      }
      console.error('[EMAIL SERVICE] Brevo API error details:', errorBody);
      throw new Error(typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody);
    }

    const data = await response.json();
    console.log(`[EMAIL SERVICE] Email sent successfully: ${data.messageId}`);
    return { success: true, messageId: data.messageId };

  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  isEmailDebugOtpEnabled,
};
