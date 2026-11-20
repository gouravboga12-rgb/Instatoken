import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Search,
  Bell,
  Star,
  Clock,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Activity,
} from 'lucide-react-native';

const SPECIALTIES = [
  { name: 'Cardiology', icon: '❤️' },
  { name: 'Dermatology', icon: '✨' },
  { name: 'Orthopedics', icon: '🦴' },
  { name: 'Pediatrics', icon: '👶' },
  { name: 'Dentistry', icon: '🦷' },
  { name: 'Neurology', icon: '🧠' },
  { name: 'General', icon: '🩺' },
];

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { hospitals, loading, refreshHospitals, activeToken, selectedCity } = useApp();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHospitals();
    setRefreshing(false);
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.doctors?.some((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialty.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSpecialty = selectedSpecialty
      ? h.departments?.some((d) => d.name.toLowerCase().includes(selectedSpecialty.toLowerCase())) ||
        h.doctors?.some((doc) => doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()))
      : true;

    return matchesSearch && matchesSpecialty;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.locationContainer}>
          <MapPin size={18} color="#0F52BA" />
          <View style={{ marginLeft: 6 }}>
            <Text style={styles.locationLabel}>Location</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {selectedCity}, Telangana ▾
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name[0].toUpperCase() : 'P'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hospitals, doctors, specialties..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Live Token Status Banner (if active) */}
        {activeToken ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.liveTokenCard}
            onPress={() => navigation.navigate('LiveTracker', { appointment: activeToken })}
          >
            <LinearGradient
              colors={['#0F52BA', '#1E40AF']}
              style={styles.liveTokenGradient}
            >
              <View style={styles.liveTokenHeader}>
                <View style={styles.liveBadge}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.liveBadgeText}>LIVE TOKEN QUEUE</Text>
                </View>
                <Text style={styles.tokenNoText}>#{activeToken.tokenNumber}</Text>
              </View>

              <Text style={styles.liveDoctorName}>{activeToken.doctorName}</Text>
              <Text style={styles.liveHospitalName}>{activeToken.hospitalName}</Text>

              <View style={styles.liveFooter}>
                <View style={styles.liveTimeBox}>
                  <Clock size={14} color="#E0E7FF" />
                  <Text style={styles.liveTimeText}>
                    Status: {activeToken.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.trackButton}>
                  <Text style={styles.trackButtonText}>Track Live ➜</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* Specialties Horizontal List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medical Specialties</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtiesScroll}
        >
          {SPECIALTIES.map((spec, i) => {
            const isSelected = selectedSpecialty === spec.name;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.specialtyChip, isSelected && styles.specialtyChipActive]}
                onPress={() =>
                  setSelectedSpecialty(isSelected ? null : spec.name)
                }
              >
                <Text style={styles.specialtyEmoji}>{spec.icon}</Text>
                <Text
                  style={[
                    styles.specialtyName,
                    isSelected && styles.specialtyNameActive,
                  ]}
                >
                  {spec.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Nearby Hospitals Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verified Hospitals & Clinics</Text>
          <Text style={styles.sectionCount}>{filteredHospitals.length} Found</Text>
        </View>

        {/* Hospitals List */}
        {filteredHospitals.map((hospital) => (
          <TouchableOpacity
            key={hospital.id}
            activeOpacity={0.9}
            style={styles.hospitalCard}
            onPress={() =>
              navigation.navigate('HospitalDetails', { hospitalId: hospital.id })
            }
          >
            <Image
              source={{
                uri:
                  hospital.image ||
                  'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&auto=format&fit=crop&q=80',
              }}
              style={styles.hospitalImage}
            />

            <View style={styles.hospitalInfo}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.hospitalName} numberOfLines={1}>
                  {hospital.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Star size={12} color="#EAB308" fill="#EAB308" />
                  <Text style={styles.ratingText}>{hospital.rating || 4.8}</Text>
                </View>
              </View>

              <Text style={styles.hospitalAddress} numberOfLines={1}>
                {hospital.address || 'Kothapet, Hyderabad'}
              </Text>

              <View style={styles.hospitalTagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {hospital.doctors?.length || 4} Doctors
                  </Text>
                </View>
                <View style={[styles.tag, styles.tagGreen]}>
                  <Text style={styles.tagGreenText}>
                    {hospital.payment_mode === 'token_only' ? 'Pay at Hospital' : 'Instant Booking'}
                  </Text>
                </View>
                <View style={styles.tag}>
                  <Clock size={10} color="#64748B" />
                  <Text style={[styles.tagText, { marginLeft: 3 }]}>
                    ~{hospital.baseWaitingTime || 15}m wait
                  </Text>
                </View>
              </View>

              <View style={styles.bookNowButton}>
                <Text style={styles.bookNowText}>Book OPD Token</Text>
                <ChevronRight size={16} color="#0F52BA" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 200,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F52BA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  liveTokenCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F52BA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  liveTokenGradient: {
    padding: 16,
  },
  liveTokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tokenNoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  liveDoctorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  liveHospitalName: {
    color: '#E0E7FF',
    fontSize: 13,
    marginTop: 2,
  },
  liveFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  liveTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveTimeText: {
    color: '#E0E7FF',
    fontSize: 12,
    marginLeft: 4,
  },
  trackButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackButtonText: {
    color: '#0F52BA',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  specialtiesScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  specialtyChipActive: {
    backgroundColor: '#0F52BA',
    borderColor: '#0F52BA',
  },
  specialtyEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  specialtyName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  specialtyNameActive: {
    color: '#FFFFFF',
  },
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hospitalImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E2E8F0',
  },
  hospitalInfo: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854D0E',
    marginLeft: 3,
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  hospitalTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  tagGreen: {
    backgroundColor: '#DCFCE7',
  },
  tagGreenText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  bookNowButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bookNowText: {
    color: '#0F52BA',
    fontSize: 13,
    fontWeight: '700',
  },
});
