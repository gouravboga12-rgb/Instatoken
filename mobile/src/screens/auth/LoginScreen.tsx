import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Phone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Building2,
  Clock,
} from 'lucide-react-native';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: any = null;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async () => {
    setError('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name to register');
      return;
    }

    setLoading(true);
    const res = await sendOtp(cleanPhone, mode);
    setLoading(false);

    if (res.success) {
      setStep('otp');
      setCountdown(60);
      setOtp('');
    } else {
      if (res.notFound) {
        setError('No registered account found with this number. Please switch to Register Patient.');
      } else if (res.alreadyExists) {
        setError('Account already exists. Please switch to Sign In.');
      } else {
        setError(res.message || 'Failed to send OTP. Please check connection.');
      }
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.length < 4) {
      setError('Please enter the verification code received on SMS.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(phone, otp, name, email, mode);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Invalid OTP code. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);

    if (!res.success && res.message !== 'Sign in cancelled') {
      Alert.alert('Google Sign-In', res.message);
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Banner */}
        <LinearGradient
          colors={['#0F52BA', '#0A3B82']}
          style={styles.bannerContainer}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>+</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>InstaToken</Text>
              <Text style={styles.brandSubtitle}>Smart Queue. Better Care.</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card Container */}
        <View style={styles.card}>
          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.tabButton, mode === 'login' && styles.activeTabButton]}
              onPress={() => {
                setMode('login');
                setStep('phone');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.tabButton, mode === 'signup' && styles.activeTabButton]}
              onPress={() => {
                setMode('signup');
                setStep('phone');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
                Register Patient
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={styles.headingBox}>
            <Text style={styles.mainHeading}>Skip the Line. Save the Time.</Text>
            <View style={styles.greenUnderline} />
            <Text style={styles.subHeading}>
              {step === 'phone'
                ? mode === 'login'
                  ? 'Enter your registered mobile number to receive your sign-in OTP.'
                  : 'Enter your mobile details to register as a new patient.'
                : `Enter the verification code sent to +91 ${phone}`}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <View style={styles.formBox}>
              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Patient Name *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter patient full name"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. patient@example.com"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInputField}
                    placeholder="Enter 10 digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {mode === 'login' ? 'Get Sign-In OTP' : 'Send Registration OTP'}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Switch Mode Prompt */}
              <TouchableOpacity
                style={styles.switchModePrompt}
                onPress={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
              >
                <Text style={styles.switchPromptText}>
                  {mode === 'login'
                    ? 'New patient? '
                    : 'Already registered? '}
                  <Text style={styles.switchPromptBold}>
                    {mode === 'login' ? 'Register Patient Here' : 'Sign In Here'}
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Native Google Account Bottom Sheet Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#0F52BA" />
                ) : (
                  <View style={styles.googleButtonContent}>
                    <Text style={styles.googleIconText}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.secureNotice}>
                <CheckCircle size={16} color="#16A34A" />
                <Text style={styles.secureNoticeText}>
                  Secure & Reliable • No password required
                </Text>
              </View>
            </View>
          ) : (
            /* OTP Step */
            <View style={styles.formBox}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter 6-Digit SMS Code</Text>
                <TextInput
                  style={styles.otpInputField}
                  placeholder="• • • • • •"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>
                    Resend OTP in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('phone')}
              >
                <ArrowLeft size={16} color="#64748B" />
                <Text style={styles.backButtonText}>Change Mobile Number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Hospital Staff Portal Link */}
          <TouchableOpacity
            style={styles.hospitalStaffLink}
            onPress={() => navigation.navigate('HospitalLogin')}
          >
            <Building2 size={16} color="#0F52BA" />
            <Text style={styles.hospitalStaffLinkText}>
              Hospital Staff? Sign in to Hospital Desk
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Zap size={16} color="#16A34A" />
            <Text style={styles.featureText}>Instant Mobile Number OTP Access</Text>
          </View>
          <View style={styles.featureItem}>
            <ShieldCheck size={16} color="#16A34A" />
            <Text style={styles.featureText}>100% Secure & SMS-Verified Patient Records</Text>
          </View>
          <View style={styles.featureItem}>
            <Clock size={16} color="#16A34A" />
            <Text style={styles.featureText}>Real-Time Live OPD Queue Tracking</Text>
          </View>
        </View>

        {/* Legal Policies Footer */}
        <View style={styles.legalFooter}>
          <TouchableOpacity onPress={() => openUrl('https://instatoken.in/terms')}>
            <Text style={styles.legalLink}>Terms & Conditions</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => openUrl('https://instatoken.in/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => openUrl('https://instatoken.in/refund-policy')}>
            <Text style={styles.legalLink}>Refund Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  bannerContainer: {
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoBadgeText: {
    color: '#0F52BA',
    fontSize: 28,
    fontWeight: 'bold',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#0F52BA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  headingBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  greenUnderline: {
    width: 90,
    height: 4,
    backgroundColor: '#22C55E',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  formBox: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  phoneInputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  countryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  phoneInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  otpInputField: {
    borderWidth: 1.5,
    borderColor: '#0F52BA',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#0F52BA',
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#0F52BA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0F52BA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchModePrompt: {
    alignItems: 'center',
    marginTop: 14,
  },
  switchPromptText: {
    fontSize: 13,
    color: '#64748B',
  },
  switchPromptBold: {
    color: '#0F52BA',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  secureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secureNoticeText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
    marginLeft: 6,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendLink: {
    fontSize: 13,
    color: '#0F52BA',
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  backButtonText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  hospitalStaffLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  hospitalStaffLinkText: {
    fontSize: 13,
    color: '#0F52BA',
    fontWeight: '600',
    marginLeft: 6,
  },
  featuresContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  legalLink: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  legalDot: {
    marginHorizontal: 8,
    color: '#CBD5E1',
  },
});
