/**
 * lib/email.ts — Welcome email via Gmail SMTP.
 * Server-side only.
 */
import nodemailer from "nodemailer";

export async function sendWelcomeEmail({ name, email, password }: { name: string; email: string; password: string }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn("Skipping welcome email: EMAIL_USER or EMAIL_APP_PASSWORD missing.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  const fromName = process.env.EMAIL_FROM_NAME || "BetterInU";
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

  const mailOptions = {
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to BetterInU!",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e2da;border-radius:12px;padding:32px;background:#fdfcf9">
        <h2 style="color:#1a4031">Welcome to BetterInU, ${name}!</h2>
        <p>Your student account has been created successfully. You can now sign in to start your learning journey.</p>
        
        <div style="background:#f5f5f0;padding:24px;border-radius:8px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#7a7a62">Login Credentials:</p>
          <p style="margin:8px 0;font-weight:bold">Email: ${email}</p>
          <p style="margin:0;font-weight:bold">Temporary Password: ${password}</p>
        </div>

        <a href="${loginUrl}" style="display:inline-block;background:#1a4031;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in to BetterInU</a>
        
        <p style="margin-top:32px;color:#7a7a62;font-size:14px">Please change your password after your first login for security.</p>
        <p style="color:#7a7a62;font-size:13px">— The BetterInU Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}
