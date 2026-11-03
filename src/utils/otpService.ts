/**
 * Insta Token - OTP & DLT SMS Verification Engine
 * Powered by MSG91 DLT Flow API (Sender: ITOKEN, Entity ID: 1001055982584059273)
 *
 * OTP is generated & verified SERVER-SIDE only.
 */

export interface OTPRecord {
  email?: string;
  phone?: string;
  code: string;
  expiresAt: number;
  type: 'customer_signup' | 'customer_forgot_password' | 'hospital_signup' | 'hospital_forgot_password' | 'customer_sms_auth' | 'hospital_sms_auth';
}

// In-memory OTP storage for legacy email fallback
const activeOTPs = new Map<string, OTPRecord>();

/**
 * Normalizes Indian mobile number to 10 digits
 */
export const normalizePhoneInput = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Request SMS OTP via MSG91 DLT Gateway
 */
export const sendSmsOtpClient = async (
  phone: string,
  purpose: 'customer_auth' | 'hospital_auth' = 'customer_auth'
): Promise<{ success: boolean; message: string; phone?: string }> => {
  const cleanPhone = normalizePhoneInput(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, message: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  try {
    const res = await fetch('/api/auth/sms/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, purpose }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || `OTP sent to +91 ${cleanPhone}`, phone: cleanPhone };
    }
    return { success: false, message: data.message || 'Failed to send OTP SMS. Please try again.' };
  } catch (err: any) {
    console.error('[SMS Service Client] Error sending SMS OTP:', err);
    return { success: false, message: 'Unable to connect to SMS service. Please check your connection.' };
  }
};

/**
 * Verify Customer SMS OTP & Authenticate / Register
 */
export const verifyCustomerOtpClient = async (
  phone: string,
  otp: string,
  name?: string
): Promise<{ success: boolean; message: string; customer?: any; needName?: boolean; isNewUser?: boolean }> => {
  try {
    const res = await fetch('/api/customers/otp-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhoneInput(phone), otp: otp.trim(), name: name?.trim() }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Verification successful',
        customer: data.customer,
        needName: data.needName,
        isNewUser: data.isNewUser
      };
    }
    return { success: false, message: data.message || 'Invalid or expired OTP code.' };
  } catch (err: any) {
    console.error('[SMS Service Client] Verification error:', err);
    return { success: false, message: 'Authentication server unreachable.' };
  }
};

/**
 * Verify Hospital SMS OTP & Login
 */
export const verifyHospitalOtpLoginClient = async (
  phone: string,
  otp: string
): Promise<{ success: boolean; message: string; token?: string; user?: any }> => {
  try {
    const res = await fetch('/api/auth/hospital-otp-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhoneInput(phone), otp: otp.trim() }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Login successful', token: data.token, user: data.user };
    }
    return { success: false, message: data.message || 'Invalid OTP or unregistered mobile number.' };
  } catch (err: any) {
    console.error('[SMS Service Client] Hospital OTP login error:', err);
    return { success: false, message: 'Hospital login service unreachable.' };
  }
};

/**
 * Verify Hospital SMS OTP & Register
 */
export const verifyHospitalOtpSignupClient = async (
  formData: {
    name: string;
    phone: string;
    otp: string;
    adminName?: string;
    email?: string;
    city?: string;
    address?: string;
    category?: string;
    registrationNumber?: string;
  }
): Promise<{ success: boolean; message: string; token?: string; user?: any }> => {
  try {
    const res = await fetch('/api/auth/hospital-otp-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        phone: normalizePhoneInput(formData.phone),
        otp: formData.otp.trim()
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Registration successful', token: data.token, user: data.user };
    }
    return { success: false, message: data.message || 'Hospital registration failed.' };
  } catch (err: any) {
    console.error('[SMS Service Client] Hospital OTP signup error:', err);
    return { success: false, message: 'Hospital signup service unreachable.' };
  }
};

/**
 * Legacy SMTP Mailer fallback (kept for email notifications)
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
    return { success: false, message: data.message || 'Failed to send OTP.' };
  } catch (err) {
    return { success: false, message: 'Unable to reach the mail server.' };
  }
};

export const verifyOTPCode = (
  email: string,
  code: string,
  type: OTPRecord['type']
): { success: boolean; message: string } => {
  const key = `${email}_${type}`;
  const record = activeOTPs.get(key);
  if (!record) return { success: false, message: 'Invalid or expired OTP.' };
  if (Date.now() > record.expiresAt) {
    activeOTPs.delete(key);
    return { success: false, message: 'OTP code has expired.' };
  }
  if (record.code !== code.trim()) {
    return { success: false, message: 'Incorrect OTP code.' };
  }
  activeOTPs.delete(key);
  return { success: true, message: 'OTP verified successfully!' };
};
