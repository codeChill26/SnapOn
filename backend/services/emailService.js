const { Resend } = require('resend');

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function isEmailDebugOtpEnabled() {
  return process.env.EMAIL_DEBUG_OTP === 'true';
}

async function sendVerificationEmail(to, name, token) {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: 'SnapOn App <onboarding@resend.dev>',
      to,
      subject: `[SnapOn] Ma xac thuc email cua ban: ${token}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #F4F5F7; padding: 40px 0;">
          <table align="center" width="100%" style="max-width: 600px; background: #FFFFFF; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 32px; text-align: center;">
                <h1 style="color: #FF6600; margin: 0;">Snap<span style="color: #090E17;">On</span></h1>
                <p style="color: #4A5568;">Chao ${name || 'ban'}, day la ma xac thuc email cua ban:</p>
                <div style="display: inline-block; margin: 24px 0; padding: 16px 32px; border: 2px solid #FFE0D1; border-radius: 8px; background: #FFF5F0; color: #FF6600; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">
                  ${token}
                </div>
                <p style="color: #E53E3E; font-size: 13px;">Ma nay co hieu luc trong 15 phut. Vui long khong chia se ma nay.</p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    if (result.error) {
      console.error('[EMAIL SERVICE] Error sending email:', result.error);
      return {
        success: false,
        error: result.error,
        message: 'Khong the gui email xac thuc luc nay. Vui long thu lai sau.',
      };
    }

    console.log(`[EMAIL SERVICE] Email sent successfully: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
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
