import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import apiClient from '../../api/client';
import {
  Building2,
  Bell,
  SkipForward,
  UserCheck,
  PlusCircle,
  LogOut,
  Users,
  Activity,
} from 'lucide-react-native';

export const CallingDeskScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, switchRole } = useAuth();
  const { socket } = useSocket();

  const [currentToken, setCurrentToken] = useState(1);
  const [waitingTokens, setWaitingTokens] = useState([2, 3, 4, 5, 6, 7]);
  const [completedCount, setCompletedCount] = useState(12);

  const handleCallNext = async () => {
    if (waitingTokens.length === 0) {
      Alert.alert('Queue Complete', 'No more patients currently waiting in queue.');
      return;
    }

    const next = waitingTokens[0];
    const remaining = waitingTokens.slice(1);
    setCurrentToken(next);
    setWaitingTokens(remaining);
    setCompletedCount((c) => c + 1);

    // Broadcast socket event
    if (socket) {
      socket.emit('TOKEN_CALLED', {
        hospitalId: user?.hospitalId || 'hosp-mu0838sg',
        doctorId: 'doc-1789390433012',
        doctorName: 'Dr. Gaurav Boga',
        tokenNumber: next,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await apiClient.post('/hospital/queue/advance', {
        hospitalId: user?.hospitalId || 'hosp-mu0838sg',
        doctorId: 'doc-1789390433012',
        tokenNumber: next,
      });
    } catch (e) {
      // ignore
    }
  };

  const handleSkip = () => {
    if (waitingTokens.length > 0) {
      const skipped = currentToken;
      const next = waitingTokens[0];
      const remaining = [...waitingTokens.slice(1), skipped];
      setCurrentToken(next);
      setWaitingTokens(remaining);
      Alert.alert('Token Skipped', `Token #${skipped} moved to the end of the queue.`);
    }
  };

  const handleRecall = () => {
    if (socket) {
      socket.emit('TOKEN_CALLED', {
        hospitalId: user?.hospitalId || 'hosp-mu0838sg',
        doctorId: 'doc-1789390433012',
        doctorName: 'Dr. Gaurav Boga',
        tokenNumber: currentToken,
        isRecall: true,
      });
    }
    Alert.alert('Recall Sent', `Audio chime and push chime sent for Token #${currentToken}`);
  };

  const handleAddWalkin = () => {
    const nextNo = (waitingTokens[waitingTokens.length - 1] || currentToken) + 1;
    setWaitingTokens([...waitingTokens, nextNo]);
    Alert.alert('Walk-in Token Added', `Assigned Walk-in Token #${nextNo}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hospitalName}>
            {user?.hospitalName || 'Gandi Hospital'}
          </Text>
          <Text style={styles.deskTitle}>Doctor OPD Live Calling Desk</Text>
        </View>
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => switchRole('patient')}
        >
          <Text style={styles.switchBtnText}>Patient App</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Calling Desk Card */}
        <View style={styles.mainCallingCard}>
          <Text style={styles.callingCardLabel}>CURRENT SERVING IN CABIN</Text>
          <Text style={styles.callingNumber}>#{currentToken}</Text>
          <Text style={styles.patientSub}>Patient: Consultation in progress</Text>

          <View style={styles.actionBtnRow}>
            <TouchableOpacity style={styles.recallBtn} onPress={handleRecall}>
              <Bell size={18} color="#0F52BA" />
              <Text style={styles.recallBtnText}>Recall Chime</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <SkipForward size={18} color="#D97706" />
              <Text style={styles.skipBtnText}>Skip Patient</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.callNextBtn}
            onPress={handleCallNext}
          >
            <UserCheck size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.callNextBtnText}>CALL NEXT PATIENT ➜</Text>
          </TouchableOpacity>
        </View>

        {/* Queue Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Users size={20} color="#0F52BA" />
            <Text style={styles.statNum}>{waitingTokens.length}</Text>
            <Text style={styles.statLabel}>Waiting in Queue</Text>
          </View>

          <View style={styles.statBox}>
            <Activity size={20} color="#16A34A" />
            <Text style={styles.statNum}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
        </View>

        {/* Up Next List */}
        <View style={styles.card}>
          <View style={styles.queueHeader}>
            <Text style={styles.cardHeading}>Up Next in Waiting Room</Text>
            <TouchableOpacity
              style={styles.walkinBtn}
              onPress={handleAddWalkin}
            >
              <PlusCircle size={14} color="#0F52BA" />
              <Text style={styles.walkinBtnText}>+ Walk-In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tokenPillRow}>
            {waitingTokens.map((t, idx) => (
              <View
                key={t}
                style={[styles.tokenPill, idx === 0 && styles.nextTokenPill]}
              >
                <Text
                  style={[
                    styles.tokenPillText,
                    idx === 0 && styles.nextTokenPillText,
                  ]}
                >
                  #{t}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Exit Hospital Desk</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deskTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  switchBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCallingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  callingCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  callingNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#38BDF8',
    marginVertical: 4,
  },
  patientSub: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 16,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  recallBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F52BA22',
    borderWidth: 1,
    borderColor: '#0F52BA',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  recallBtnText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 13,
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F59E0B22',
    borderWidth: 1,
    borderColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  skipBtnText: {
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 13,
  },
  callNextBtn: {
    backgroundColor: '#0F52BA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#0F52BA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  callNextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  walkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F52BA33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  walkinBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  tokenPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tokenPill: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextTokenPill: {
    backgroundColor: '#0F52BA',
  },
  tokenPillText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 14,
  },
  nextTokenPillText: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
});
