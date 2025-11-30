import nodemailer from 'nodemailer';

// Create reusable transporter
// For Gmail, you need to:
// 1. Enable 2-Factor Authentication on your Google account
// 2. Generate an App Password at https://myaccount.google.com/apppasswords
// 3. Use that App Password as EMAIL_PASSWORD

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password, not regular password
  },
});

// Alternative: Use custom SMTP settings
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT || '587'),
//   secure: process.env.SMTP_SECURE === 'true',
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

export interface SendOTPOptions {
  to: string;
  otp: string;
  name?: string;
}

export async function sendVerificationOTP({ to, otp, name }: SendOTPOptions): Promise<boolean> {
  const appName = 'ChatApp';
  const userName = name || 'there';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px;">💬</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Verify your email
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Hi ${userName}! 👋
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Thanks for signing up for ${appName}. Use the verification code below to complete your registration:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #ede9fe 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                  Your verification code
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #3b82f6; letter-spacing: 8px; font-family: monospace;">
                  ${otp}
                </p>
              </div>
              
              <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;">
                ⏱️ This code expires in <strong>10 minutes</strong>
              </p>
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                If you didn't create an account, you can ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
Hi ${userName}!

Thanks for signing up for ${appName}. Use the verification code below to complete your registration:

Your verification code: ${otp}

This code expires in 10 minutes.

If you didn't create an account, you can ignore this email.

© ${new Date().getFullYear()} ${appName}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${otp} is your ${appName} verification code`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetOTP({ to, otp, name }: SendOTPOptions): Promise<boolean> {
  const appName = 'ChatApp';
  const userName = name || 'there';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px;">🔐</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Reset your password
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Hi ${userName}! 👋
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                We received a request to reset your password. Use the code below to proceed:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                  Your reset code
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #f59e0b; letter-spacing: 8px; font-family: monospace;">
                  ${otp}
                </p>
              </div>
              
              <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;">
                ⏱️ This code expires in <strong>10 minutes</strong>
              </p>
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                If you didn't request a password reset, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
Hi ${userName}!

We received a request to reset your password. Use the code below to proceed:

Your reset code: ${otp}

This code expires in 10 minutes.

If you didn't request a password reset, please ignore this email.

© ${new Date().getFullYear()} ${appName}
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${otp} is your ${appName} password reset code`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}
