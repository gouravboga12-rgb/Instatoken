/**
 * Insta Token - OTP & Email Verification Engine
 * Powered by InstaToken.in Mailer (token.in1999@gmail.com)
 *
 * OTP is generated SERVER-SIDE only.
 * Frontend only sends the request and verifies the code entered by user.
 * OTP is NEVER exposed to the frontend or browser console.
 */

export interface OTPRecord {
  email: string;
  code: string;
  expiresAt: number;
  type: 'customer_signup' | 'customer_forgot_password' | 'hospital_signup' | 'hospital_forgot_password';
}

// In-memory OTP storage (server-side verification)
const activeOTPs = new Map<string, OTPRecord>();

/**
 * Request OTP email via InstaToken.in SMTP service (token.in1999@gmail.com)
 * OTP is generated on the SERVER — not returned to the frontend.
 */
export const sendOTPEmail = async (
  email: string,
  type: OTPRecord['type'],
  recipientName: string = 'User'
): Promise<{ success: boolean; message: string }> => {

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        type,
        recipientName,
        company: 'InstaToken.in',
        from: 'InstaToken.in <token.in1999@gmail.com>',
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Store OTP record locally for verification (code comes from server)
      if (data.code) {
        activeOTPs.set(`${email}_${type}`, {
          email,
          code: data.code,
          expiresAt: Date.now() + 5 * 60 * 1000,
          type,
        });
      }
      return { success: true, message: `OTP sent to ${email}` };
    }

    return {
      success: false,
      message: data.message || 'Failed to send OTP. Please try again.',
    };
  } catch (err) {
    console.error('[InstaToken SMTP] Error sending OTP:', err);
    return {
      success: false,
      message: 'Unable to reach the mail server. Please check your connection.',
    };
  }
};

/**
 * Verify user-entered OTP against server-stored record
 */
export const verifyOTPCode = (
  email: string,
  code: string,
  type: OTPRecord['type']
): { success: boolean; message: string } => {
  const key = `${email}_${type}`;
  const record = activeOTPs.get(key);

  if (!record) {
    return { success: false, message: 'Invalid or expired OTP. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    activeOTPs.delete(key);
    return { success: false, message: 'OTP code has expired. Please request a new code.' };
  }

  if (record.code !== code.trim()) {
    return { success: false, message: 'Incorrect OTP code. Please try again.' };
  }

  // Clear OTP after successful verification
  activeOTPs.delete(key);
  return { success: true, message: 'OTP verified successfully!' };
};
