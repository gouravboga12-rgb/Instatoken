import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Phone,
  Star,
  Clock,
  ArrowLeft,
  Calendar,
  CreditCard,
  ChevronRight,
} from 'lucide-react-native';

export const HospitalDetailsScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { hospitalId } = route.params;
  const { hospitals } = useApp();

  const hospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];

  if (!hospital) {
    return (
      <View style={styles.center}>
        <Text>Hospital not found</Text>
      </View>
    );
  }

  const callPhone = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Image with Back Button */}
        <View style={styles.imageBox}>
          <Image
            source={{
              uri:
                hospital.image ||
                'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
            }}
            style={styles.image}
          />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hospital Card Header */}
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{hospital.name}</Text>
            <View style={styles.ratingBadge}>
              <Star size={14} color="#EAB308" fill="#EAB308" />
              <Text style={styles.ratingText}>{hospital.rating || 4.8}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={16} color="#64748B" />
            <Text style={styles.addressText}>{hospital.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color="#64748B" />
            <Text style={styles.addressText}>
              OPD Hours: {hospital.timings || '09:00 AM - 08:00 PM'}
            </Text>
          </View>

          {hospital.phone ? (
            <TouchableOpacity
              style={styles.callRow}
              onPress={() => callPhone(hospital.phone)}
            >
              <Phone size={16} color="#0F52BA" />
              <Text style={styles.callText}>Call Reception: {hospital.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Payment Mode Banner */}
          <View
            style={[
              styles.paymentBanner,
              hospital.payment_mode === 'token_only'
                ? styles.tokenBanner
                : styles.onlineBanner,
            ]}
          >
            <CreditCard
              size={16}
              color={hospital.payment_mode === 'token_only' ? '#15803D' : '#0F52BA'}
            />
            <Text
              style={[
                styles.paymentBannerText,
                {
                  color:
                    hospital.payment_mode === 'token_only' ? '#15803D' : '#0F52BA',
                },
              ]}
            >
              {hospital.payment_mode === 'token_only'
                ? 'Pay at Hospital: Pay only ₹20 token fee online. Doctor consultation fee collected at desk.'
                : 'Full Online Advance: Consultation + token fee paid online via Razorpay.'}
            </Text>
          </View>
        </View>

        {/* Doctor List Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeading}>Available OPD Doctors</Text>
          <Text style={styles.sectionSubtitle}>
            Select a specialist doctor to book your token slot
          </Text>

          {(hospital.doctors || []).map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              <View style={styles.docRow}>
                <Image
                  source={{
                    uri:
                      doc.image ||
                      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
                  }}
                  style={styles.docAvatar}
                />
                <View style={styles.docDetails}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docSpecialty}>{doc.specialty}</Text>
                  <Text style={styles.docExp}>
                    {doc.qualification || 'MBBS, MD'} • {doc.experience || 8}+ yrs exp
                  </Text>
                  <Text style={styles.docFee}>
                    Consultation Fee: ₹{doc.consultationFee || 400}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookDocBtn}
                onPress={() =>
                  navigation.navigate('BookToken', {
                    hospitalId: hospital.id,
                    doctorId: doc.id,
                  })
                }
              >
                <Text style={styles.bookDocBtnText}>Book Token Slot</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  imageBox: {
    position: 'relative',
    height: 220,
    backgroundColor: '#0F172A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854D0E',
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  callText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F52BA',
    marginLeft: 8,
  },
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  tokenBanner: {
    backgroundColor: '#DCFCE7',
  },
  onlineBanner: {
    backgroundColor: '#E0E7FF',
  },
  paymentBannerText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  sectionBox: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docRow: {
    flexDirection: 'row',
  },
  docAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
  },
  docDetails: {
    marginLeft: 14,
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSpecialty: {
    fontSize: 13,
    color: '#0F52BA',
    fontWeight: '600',
    marginTop: 2,
  },
  docExp: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  docFee: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 4,
  },
  bookDocBtn: {
    backgroundColor: '#0F52BA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  bookDocBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
});
