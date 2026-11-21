import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Mail,
  Sparkles,
} from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Compact spacing for shorter screens
const isSmallScreen = SCREEN_HEIGHT < 750;

interface RoleChooserScreenProps {
  navigation: any;
}

export const RoleChooserScreen: React.FC<RoleChooserScreenProps> = ({ navigation }) => {
  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.container}>
        {/* TOP BRAND HEADER */}
        <View style={styles.brandHeader}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>InstaToken</Text>
          <Text style={styles.brandSubtitle}>Smart OPD Queue Management</Text>
          <View style={styles.promptBadge}>
            <Text style={styles.promptText}>SELECT YOUR PORTAL</Text>
          </View>
        </View>

        {/* TWO CARDS (UPPER & LOWER) - 100% FIT, NO SCROLLING */}
        <View style={styles.cardsContainer}>
          {/* 1. UPPER BOX: LOGIN AS PATIENT */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.cardWrapper}
            onPress={() =>
              navigation.navigate('WebContainer', {
                initialUrl: 'https://instatoken.in/login',
                title: 'Patient Portal',
                role: 'patient',
              })
            }
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F7FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.patientCard}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircleBlue}>
                  <User size={isSmallScreen ? 20 : 24} color="#0055FE" />
                </View>
                <View style={styles.tagBlue}>
                  <Smartphone size={11} color="#0055FE" />
                  <Text style={styles.tagBlueText}>PATIENT ACCESS</Text>
                </View>
              </View>

              <Text style={styles.cardTitleBlue}>Login as a Patient</Text>
              <Text style={styles.cardDescBlue} numberOfLines={2}>
                Book OPD tokens, view live doctor queue wait times & download digital token passes.
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.featureBadgeLight}>
                  <ShieldCheck size={12} color="#16A34A" />
                  <Text style={styles.badgeTextLight}>Mobile SMS OTP</Text>
                </View>
                <View style={styles.featureBadgeLight}>
                  <Sparkles size={12} color="#0055FE" />
                  <Text style={styles.badgeTextLight}>Google Sign-In</Text>
                </View>
              </View>

              <View style={styles.btnBlue}>
                <Text style={styles.btnBlueText}>Continue as Patient</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 2. LOWER BOX: LOGIN AS HOSPITAL PANEL MEMBER */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.cardWrapper}
            onPress={() =>
              navigation.navigate('WebContainer', {
                initialUrl: 'https://instatoken.in/hospital-login',
                title: 'Hospital Portal',
                role: 'hospital',
              })
            }
          >
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hospitalCard}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircleCyan}>
                  <Building2 size={isSmallScreen ? 20 : 24} color="#38BDF8" />
                </View>
                <View style={styles.tagCyan}>
                  <Mail size={11} color="#38BDF8" />
                  <Text style={styles.tagCyanText}>HOSPITAL PANEL</Text>
                </View>
              </View>

              <Text style={styles.cardTitleDark}>Login as Hospital Member</Text>
              <Text style={styles.cardDescDark} numberOfLines={2}>
                Hospital administration, OPD doctor cabin calling desk & staff roster management.
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.featureBadgeDark}>
                  <ShieldCheck size={12} color="#38BDF8" />
                  <Text style={styles.badgeTextDark}>Email & Password</Text>
                </View>
                <View style={styles.featureBadgeDark}>
                  <Mail size={12} color="#38BDF8" />
                  <Text style={styles.badgeTextDark}>Email OTP Verification</Text>
                </View>
              </View>

              <View style={styles.btnCyan}>
                <Text style={styles.btnCyanText}>Hospital Staff Portal</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => openUrl('https://instatoken.in/terms')}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => openUrl('https://instatoken.in/privacy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => openUrl('https://instatoken.in/refund-policy')}>
              <Text style={styles.footerLink}>Refund Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyright}>© 2026 InstaToken • Smart Queue. Better Care.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: isSmallScreen ? 8 : 12,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: isSmallScreen ? 6 : 14,
  },
  logoContainer: {
    width: isSmallScreen ? 54 : 64,
    height: isSmallScreen ? 54 : 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0055FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: isSmallScreen ? 22 : 25,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  promptBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: isSmallScreen ? 6 : 8,
  },
  promptText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0055FE',
    letterSpacing: 0.8,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: isSmallScreen ? 10 : 14,
    paddingVertical: 8,
  },
  cardWrapper: {
    flex: 1,
    maxHeight: isSmallScreen ? 210 : 240,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  patientCard: {
    flex: 1,
    padding: isSmallScreen ? 14 : 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    justifyContent: 'space-between',
  },
  hospitalCard: {
    flex: 1,
    padding: isSmallScreen ? 14 : 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircleBlue: {
    width: isSmallScreen ? 38 : 44,
    height: isSmallScreen ? 38 : 44,
    borderRadius: 12,
    backgroundColor: '#E0EDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleCyan: {
    width: isSmallScreen ? 38 : 44,
    height: isSmallScreen ? 38 : 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0EDFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tagBlueText: {
    color: '#0055FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tagCyan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tagCyanText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardTitleBlue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  cardTitleDark: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardDescBlue: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#64748B',
    lineHeight: 16,
  },
  cardDescDark: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeTextLight: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
  },
  featureBadgeDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeTextDark: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  btnBlue: {
    backgroundColor: '#0055FE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : 12,
    borderRadius: 12,
    gap: 6,
  },
  btnBlueText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '800',
  },
  btnCyan: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : 12,
    borderRadius: 12,
    gap: 6,
  },
  btnCyanText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: isSmallScreen ? 4 : 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  footerDot: {
    marginHorizontal: 8,
    color: '#CBD5E1',
  },
  copyright: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 4,
  },
});
