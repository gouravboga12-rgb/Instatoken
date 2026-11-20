import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  LogOut,
  FileText,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, switchRole } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from InstaToken?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name[0].toUpperCase() : 'P'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'InstaToken Patient'}</Text>
        <Text style={styles.userRole}>
          {user?.role === 'hospital' ? 'Hospital Staff Admin' : 'Registered Patient'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contact Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Account Information</Text>

          <View style={styles.infoRow}>
            <Phone size={16} color="#64748B" />
            <Text style={styles.infoText}>
              {user?.phone ? `+91 ${user.phone}` : 'Mobile verified'}
            </Text>
          </View>

          {user?.email ? (
            <View style={styles.infoRow}>
              <Mail size={16} color="#64748B" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
          ) : null}

          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#16A34A" />
            <Text style={styles.verifiedText}>SMS-Verified Patient Profile</Text>
          </View>
        </View>

        {/* Panel Switcher (Patient vs Hospital) */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Panel Switcher</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              if (user?.role === 'hospital') {
                switchRole('patient');
              } else {
                navigation.navigate('HospitalLogin');
              }
            }}
          >
            <Building2 size={20} color="#0F52BA" />
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Hospital Administration Panel</Text>
              <Text style={styles.actionSub}>
                {user?.role === 'hospital'
                  ? 'Switch back to Patient View'
                  : 'Log in to Doctor OPD Live Calling Desk'}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Legal & Policies */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Legal & Compliance</Text>

          <TouchableOpacity
            style={styles.policyRow}
            onPress={() => openUrl('https://instatoken.in/terms')}
          >
            <FileText size={18} color="#475569" />
            <Text style={styles.policyText}>Terms & Conditions</Text>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.policyRow}
            onPress={() => openUrl('https://instatoken.in/privacy')}
          >
            <FileText size={18} color="#475569" />
            <Text style={styles.policyText}>Privacy Policy</Text>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.policyRow}
            onPress={() => openUrl('https://instatoken.in/refund-policy')}
          >
            <FileText size={18} color="#475569" />
            <Text style={styles.policyText}>Cancellation & Refund Policy</Text>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Sign Out from Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>InstaToken Mobile v1.0.0 (Release APK)</Text>
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
    paddingTop: 54,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F52BA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    marginLeft: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  policyText: {
    fontSize: 13,
    color: '#334155',
    marginLeft: 10,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 20,
  },
});
