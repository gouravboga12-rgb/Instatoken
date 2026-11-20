import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  Share2,
  Activity,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Home,
} from 'lucide-react-native';

export const TokenPassScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { appointment } = route.params;

  const qrData = JSON.stringify({
    tokenNumber: appointment.tokenNumber,
    bookingId: appointment.id,
    patientName: appointment.patientName,
    doctorName: appointment.doctorName,
    hospitalName: appointment.hospitalName,
    date: appointment.date,
  });

  const handleShareWhatsApp = async () => {
    const text = `🏥 *InstaToken OPD Appointment Pass*\n\n*Token Number:* #${appointment.tokenNumber}\n*Patient:* ${appointment.patientName}\n*Doctor:* ${appointment.doctorName}\n*Hospital:* ${appointment.hospitalName}\n*Date & Slot:* ${appointment.date} (${appointment.time})\n\nTrack Live Queue: https://instatoken.in/tracker/${appointment.id}`;
    try {
      await Share.share({
        message: text,
      });
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success Icon */}
        <View style={styles.successHeader}>
          <CheckCircle size={48} color="#22C55E" />
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your digital OPD token pass has been generated.
          </Text>
        </View>

        {/* Digital Pass Card */}
        <View style={styles.passCard}>
          <LinearGradient
            colors={['#0F52BA', '#1E40AF']}
            style={styles.passHeader}
          >
            <View style={styles.passHeaderTop}>
              <Text style={styles.appName}>INSTATOKEN PASS</Text>
              <Text style={styles.liveTag}>CONFIRMED</Text>
            </View>
            <Text style={styles.tokenNumber}>#{appointment.tokenNumber}</Text>
            <Text style={styles.tokenHint}>Assigned OPD Token Number</Text>
          </LinearGradient>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <QRCode value={qrData} size={150} />
            <Text style={styles.qrHint}>
              Show this QR code at hospital reception desk
            </Text>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Patient Name:</Text>
              <Text style={styles.val}>{appointment.patientName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Doctor:</Text>
              <Text style={styles.val}>{appointment.doctorName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Hospital:</Text>
              <Text style={styles.val}>{appointment.hospitalName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Scheduled Slot:</Text>
              <Text style={styles.val}>
                {appointment.date} • {appointment.time}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={[styles.val, { color: '#16A34A', fontWeight: 'bold' }]}>
                PAID (₹{appointment.totalFee || 32.60})
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.liveQueueBtn}
          onPress={() =>
            navigation.navigate('LiveTracker', { appointment })
          }
        >
          <Activity size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.liveQueueBtnText}>Track Live Queue & Waiting Time</Text>
          <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsAppBtn}
          onPress={handleShareWhatsApp}
        >
          <Share2 size={18} color="#15803D" style={{ marginRight: 8 }} />
          <Text style={styles.whatsAppBtnText}>Share Pass on WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Home size={16} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.homeBtnText}>Return to Home</Text>
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
  scroll: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  passHeader: {
    padding: 20,
    alignItems: 'center',
  },
  passHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  appName: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveTag: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '700',
  },
  tokenNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  tokenHint: {
    color: '#E0E7FF',
    fontSize: 12,
  },
  qrSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qrHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 12,
  },
  detailsGrid: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
  },
  val: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  liveQueueBtn: {
    backgroundColor: '#0F52BA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  liveQueueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  whatsAppBtn: {
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  whatsAppBtnText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  homeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  homeBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
