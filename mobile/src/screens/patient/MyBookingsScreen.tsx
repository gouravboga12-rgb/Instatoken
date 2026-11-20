import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Clock,
  Activity,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

export const MyBookingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { myBookings, refreshHospitals, loading } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My OPD Tokens</Text>
        <Text style={styles.headerSubtitle}>
          View all your booked appointments & live queue status
        </Text>
      </View>

      <FlatList
        data={myBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshHospitals} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Calendar size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Appointments Booked</Text>
            <Text style={styles.emptySub}>
              Search hospitals and book an instant OPD token.
            </Text>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.bookNowBtnText}>Find Hospitals</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isActive =
            item.status === 'booked' ||
            item.status === 'waiting' ||
            item.status === 'calling';

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => {
                if (isActive) {
                  navigation.navigate('LiveTracker', { appointment: item });
                } else {
                  navigation.navigate('TokenPass', { appointment: item });
                }
              }}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.tokenBadge}>TOKEN #{item.tokenNumber}</Text>
                  <Text style={styles.doctorName}>{item.doctorName}</Text>
                  <Text style={styles.specialty}>{item.departmentName}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'completed'
                      ? styles.statusCompleted
                      : item.status === 'cancelled'
                      ? styles.statusCancelled
                      : styles.statusActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.status === 'completed'
                        ? styles.statusCompletedText
                        : item.status === 'cancelled'
                        ? styles.statusCancelledText
                        : styles.statusActiveText,
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.hospitalName}>{item.hospitalName}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={13} color="#64748B" />
                  <Text style={styles.metaText}>{item.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={13} color="#64748B" />
                  <Text style={styles.metaText}>{item.time}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.patientName}>
                  Patient: <Text style={{ fontWeight: '600' }}>{item.patientName}</Text>
                </Text>
                <View style={styles.actionRow}>
                  <Text style={styles.actionText}>
                    {isActive ? 'Track Live Queue' : 'View Pass'}
                  </Text>
                  <ArrowRight size={14} color="#0F52BA" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tokenBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F52BA',
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  specialty: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActive: {
    backgroundColor: '#EFF6FF',
  },
  statusActiveText: {
    color: '#0F52BA',
    fontSize: 10,
    fontWeight: '700',
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusCompletedText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusCancelledText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  hospitalName: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  patientName: {
    fontSize: 12,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F52BA',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  bookNowBtn: {
    marginTop: 16,
    backgroundColor: '#0F52BA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
