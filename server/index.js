const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Nodemailer SMTP Transporter setup for token.in1999@gmail.com
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'token.in1999@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'rnppcyctnhowcynk',
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ Real SMTP Mailer Connected via token.in1999@gmail.com!');
  }
});

// API Endpoint to Send Real OTP Emails
app.post('/api/send-otp', async (req, res) => {
  const { email, code, type, recipientName } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
  }

  let title = 'Verification Code';
  let subtitle = 'Complete your authentication';

  if (type === 'customer_signup') {
    title = 'Welcome to Insta Token!';
    subtitle = 'Verify your email to complete registration';
  } else if (type === 'customer_forgot_password') {
    title = 'Reset Your Password';
    subtitle = 'Use the code below to set a new password';
  } else if (type === 'hospital_signup') {
    title = 'Hospital Registration Verification';
    subtitle = 'Verify your hospital account to activate dashboard access';
  } else if (type === 'hospital_forgot_password') {
    title = 'Hospital Admin Password Reset';
    subtitle = 'Use the code below to reset your hospital admin password';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
        .brand { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 6px; }
        .content { padding: 28px 0; text-align: center; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
        .otp-box { background: linear-gradient(135deg, #2563eb, #4338ca); color: #ffffff; font-size: 36px; font-weight: 900; letter-spacing: 12px; padding: 20px; border-radius: 16px; margin: 20px 0; font-family: monospace; }
        .info { font-size: 12px; color: #64748b; line-height: 1.6; background: #f8fafc; padding: 14px; border-radius: 12px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">Insta Token 🩺</div>
          <div class="badge">Healthcare OTP Authentication</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="subtitle">Hello ${recipientName || 'User'}, ${subtitle}</div>
          
          <div class="otp-box">${code}</div>

          <p style="font-size: 13px; color: #475569; font-weight: 600;">This code is valid for <strong>5 minutes</strong>. Do not share this OTP with anyone.</p>

          <div class="info">
            🔒 Sent securely via <strong>Insta Token Mailer</strong> (token.in1999@gmail.com).<br>
            If you did not request this code, please ignore this email.
          </div>
        </div>
        <div class="footer">
          © 2026 Insta Token HMS · Automated OTP System · All Rights Reserved
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Insta Token" <token.in1999@gmail.com>',
      to: email,
      subject: `[Insta Token] ${code} is your OTP Verification Code`,
      html: htmlContent,
    });

    console.log(`✉️ Email sent successfully to ${email} (MessageId: ${info.messageId})`);
    return res.json({ success: true, message: `OTP code sent to ${email}`, messageId: info.messageId });
  } catch (err) {
    console.error('❌ Error sending mail:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP email.', error: err.message });
  }
});

// Serve frontend static build files if available
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Insta Token Unified Express Server running on port ${PORT}`);
});
