import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  CreditCard,
} from 'lucide-react-native';

export const BookTokenScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { hospitalId, doctorId } = route.params;
  const { hospitals, bookAppointment } = useApp();
  const { user } = useAuth();

  const hospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];
  const doctor =
    hospital?.doctors?.find((d) => d.id === doctorId) ||
    hospital?.doctors?.[0] || {
      id: 'doc-1',
      name: 'Dr. Gaurav Boga',
      specialty: 'Cardiology',
      consultationFee: 400,
    };

  const [date, setDate] = useState('Today');
  const [session, setSession] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [patientName, setPatientName] = useState(user?.name || '');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  // Dynamic payment mode fetched directly from public API
  const [paymentMode, setPaymentMode] = useState<string>(
    hospital?.payment_mode || 'token_only'
  );

  useEffect(() => {
    fetchPaymentSettings();
  }, [hospitalId]);

  const fetchPaymentSettings = async () => {
    try {
      const res = await apiClient.get(`/hospitals/${hospitalId}/public-payment-settings`);
      if (res.data?.success && res.data.payment_mode) {
        setPaymentMode(res.data.payment_mode);
      }
    } catch (e) {
      // ignore
    }
  };

  const isTokenOnly = paymentMode === 'token_only';
  const consultFee = doctor.consultationFee || 400;
  const tokenFee = 20;
  const platformFee = 12.6; // incl GST
  const totalPayable = isTokenOnly ? tokenFee + platformFee : consultFee + tokenFee + platformFee;

  const handleBooking = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter mobile number.');
      return;
    }

    setLoading(true);
    const bookingPayload = {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      departmentName: doctor.specialty || 'General',
      patientName: patientName.trim(),
      age: parseInt(age) || 28,
      gender,
      phone: phone.trim(),
      date: new Date().toISOString().split('T')[0],
      time: session === 'morning' ? '10:30 AM' : session === 'afternoon' ? '03:00 PM' : '07:00 PM',
      session,
      fee: consultFee,
      tokenFee,
      platformFee,
      totalFee: totalPayable,
      collectionMode: isTokenOnly ? 'token_only' : 'full_online',
      status: 'booked',
      paymentMethod: 'ONLINE_UPI',
      paymentId: `pay_${Date.now()}`,
    };

    const res = await bookAppointment(bookingPayload);
    setLoading(false);

    if (res.success && res.appointment) {
      navigation.replace('TokenPass', { appointment: res.appointment });
    } else {
      Alert.alert('Booking Error', res.message || 'Could not complete token booking.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book OPD Token</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Doctor Summary Card */}
        <View style={styles.docSummaryCard}>
          <Text style={styles.docName}>{doctor.name}</Text>
          <Text style={styles.docSpecialty}>{doctor.specialty}</Text>
          <Text style={styles.hospitalName}>{hospital.name}</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select Booking Day</Text>
          <View style={styles.row}>
            {['Today', 'Tomorrow'].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, date === d && styles.chipActive]}
                onPress={() => setDate(d)}
              >
                <Calendar size={14} color={date === d ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.chipText, date === d && styles.chipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Session Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. OPD Session Timing</Text>
          <View style={styles.sessionRow}>
            {[
              { id: 'morning', label: 'Morning', time: '09:00 AM - 01:00 PM' },
              { id: 'afternoon', label: 'Afternoon', time: '02:00 PM - 05:00 PM' },
              { id: 'evening', label: 'Evening', time: '06:00 PM - 09:00 PM' },
            ].map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sessionCard, session === s.id && styles.sessionCardActive]}
                onPress={() => setSession(s.id as any)}
              >
                <Text style={[styles.sessionTitle, session === s.id && styles.sessionTitleActive]}>
                  {s.label}
                </Text>
                <Text style={[styles.sessionTime, session === s.id && styles.sessionTimeActive]}>
                  {s.time}
                </Text>
                <View style={styles.capacityBadge}>
                  <Text style={styles.capacityText}>Available</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Patient Information</Text>

          <Text style={styles.label}>Patient Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Kumar"
            value={patientName}
            onChangeText={setPatientName}
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 32"
                keyboardType="number-pad"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g as any)}
                  >
                    <Text
                      style={[
                        styles.genderBtnText,
                        gender === g && styles.genderBtnTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Fee Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isTokenOnly ? 'Pay at Hospital Breakdown' : 'Full Online Booking Breakdown'}
          </Text>

          <View style={styles.feeLine}>
            <Text style={styles.feeLabel}>Doctor Consultation Fee</Text>
            <Text style={styles.feeValue}>
              ₹{consultFee.toFixed(2)} {isTokenOnly && '(Pay at Hospital)'}
            </Text>
          </View>

          <View style={styles.feeLine}>
            <Text style={styles.feeLabel}>Token Fee</Text>
            <Text style={styles.feeValue}>₹{tokenFee.toFixed(2)}</Text>
          </View>

          <View style={styles.feeLine}>
            <Text style={styles.feeLabel}>Platform Fee (incl. GST)</Text>
            <Text style={styles.feeValue}>₹{platformFee.toFixed(2)}</Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.feeLine}>
            <Text style={styles.totalLabel}>Total Payable Now</Text>
            <Text style={styles.totalValue}>₹{totalPayable.toFixed(2)}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.payButton}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.payBtnContent}>
              <CreditCard size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>
                Pay ₹{totalPayable.toFixed(2)} & Confirm Booking
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  docSummaryCard: {
    backgroundColor: '#0F52BA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  docName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  docSpecialty: {
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 2,
  },
  hospitalName: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#0F52BA',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sessionRow: {
    gap: 8,
  },
  sessionCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  sessionCardActive: {
    borderColor: '#0F52BA',
    backgroundColor: '#EFF6FF',
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionTitleActive: {
    color: '#0F52BA',
  },
  sessionTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sessionTimeActive: {
    color: '#1E40AF',
  },
  capacityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  capacityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  twoCol: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderBtnActive: {
    backgroundColor: '#0F52BA',
    borderColor: '#0F52BA',
  },
  genderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  feeLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F52BA',
  },
  payButton: {
    backgroundColor: '#0F52BA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0F52BA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
