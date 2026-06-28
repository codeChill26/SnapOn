function isEmailDebugOtpEnabled() {
  return process.env.EMAIL_DEBUG_OTP === 'true';
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
      subject: `[SnapOn] Ma xac thuc email cua ban: ${token}`,
      htmlContent: `
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
