import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, ArrowLeft, AlertCircle, ArrowRight } from 'lucide-react-native';

export const HospitalLoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { sendOtp, hospitalLogin } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit registered mobile number');
      return;
    }

    setLoading(true);
    const res = await sendOtp(cleanPhone, 'login');
    setLoading(false);

    if (res.success) {
      setStep('otp');
    } else {
      setError(res.message || 'Hospital mobile not found. Please contact administration.');
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.length < 4) {
      setError('Please enter the OTP sent to your registered mobile');
      return;
    }

    setLoading(true);
    const res = await hospitalLogin(phone, otp);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backText}>Patient Sign In</Text>
          </TouchableOpacity>
          <View style={styles.iconCircle}>
            <Building2 size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Hospital Administration</Text>
          <Text style={styles.subtitle}>Doctor & Staff Live Calling Portal</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Sign In</Text>
          <Text style={styles.cardSub}>
            Enter your registered hospital mobile number to receive your OTP.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <View>
              <Text style={styles.label}>Hospital Registered Mobile *</Text>
              <View style={styles.phoneInputRow}>
                <Text style={styles.phonePrefix}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <Text style={styles.buttonText}>Send Staff OTP</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Access Calling Desk</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backStep}
                onPress={() => setStep('phone')}
              >
                <Text style={styles.backStepText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    marginBottom: 16,
  },
  phonePrefix: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0F52BA',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backStep: {
    alignItems: 'center',
    marginTop: 14,
  },
  backStepText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
});
