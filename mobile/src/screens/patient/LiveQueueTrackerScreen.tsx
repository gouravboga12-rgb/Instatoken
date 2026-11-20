import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSocket } from '../../context/SocketContext';
import apiClient from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Clock,
  Activity,
  AlertCircle,
  Bell,
  RefreshCw,
  CheckCircle,
} from 'lucide-react-native';

export const LiveQueueTrackerScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { appointment } = route.params;
  const { socket, activeCallingToken } = useSocket();

  const [currentQueue, setCurrentQueue] = useState(
    Math.max(1, (appointment.tokenNumber || 4) - 2)
  );
  const [status, setStatus] = useState<string>(appointment.status || 'waiting');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLiveQueue();
  }, [appointment]);

  useEffect(() => {
    if (activeCallingToken && activeCallingToken.doctorId === appointment.doctorId) {
      setCurrentQueue(activeCallingToken.tokenNumber);
      if (activeCallingToken.tokenNumber === appointment.tokenNumber) {
        setStatus('calling');
      }
    }
  }, [activeCallingToken]);

  const fetchLiveQueue = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.get(
        `/hospitals/${appointment.hospitalId}/doctors/${appointment.doctorId}/queue`
      );
      if (res.data?.success) {
        setCurrentQueue(res.data.currentQueue || currentQueue);
      }
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const tokensAhead = Math.max(0, (appointment.tokenNumber || 1) - currentQueue);
  const estimatedMins = tokensAhead * 12;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Queue Tracker</Text>
        <TouchableOpacity onPress={fetchLiveQueue} disabled={refreshing}>
          <RefreshCw size={18} color="#0F52BA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Calling Alert Banner if it's patient's turn! */}
        {status === 'calling' || tokensAhead === 0 ? (
          <View style={styles.callingAlert}>
            <Bell size={24} color="#FFFFFF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.callingAlertTitle}>IT'S YOUR TURN!</Text>
              <Text style={styles.callingAlertSubtitle}>
                Doctor is calling Token #{appointment.tokenNumber}. Please proceed to Cabin 1.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Live Status Visualizer */}
        <View style={styles.card}>
          <View style={styles.queueVisualizerRow}>
            {/* Current Serving */}
            <View style={styles.visualizerBox}>
              <Text style={styles.boxLabel}>CURRENT SERVING</Text>
              <Text style={styles.currentNum}>#{currentQueue}</Text>
              <Text style={styles.boxSub}>In Doctor's Cabin</Text>
            </View>

            <View style={styles.dividerArrow}>
              <Text style={{ fontSize: 20 }}>➔</Text>
            </View>

            {/* Your Token */}
            <View style={[styles.visualizerBox, styles.myTokenBox]}>
              <Text style={[styles.boxLabel, { color: '#0F52BA' }]}>YOUR TOKEN</Text>
              <Text style={[styles.currentNum, { color: '#0F52BA' }]}>
                #{appointment.tokenNumber}
              </Text>
              <Text style={[styles.boxSub, { color: '#1E40AF' }]}>
                {tokensAhead === 0 ? 'Now Calling!' : `${tokensAhead} Patients Ahead`}
              </Text>
            </View>
          </View>

          {/* Estimated Wait Card */}
          <View style={styles.estCard}>
            <Clock size={20} color="#0F52BA" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.estLabel}>ESTIMATED WAIT TIME</Text>
              <Text style={styles.estValue}>
                {tokensAhead === 0 ? '0 Minutes (Immediate)' : `~${estimatedMins} Minutes`}
              </Text>
            </View>
          </View>
        </View>

        {/* Doctor & Hospital Details */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Consultation Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor:</Text>
            <Text style={styles.value}>{appointment.doctorName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Department:</Text>
            <Text style={styles.value}>{appointment.departmentName || 'General OPD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hospital:</Text>
            <Text style={styles.value}>{appointment.hospitalName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Session Slot:</Text>
            <Text style={styles.value}>
              {appointment.date} ({appointment.time})
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>OPD Instructions</Text>
          <View style={styles.instructionItem}>
            <CheckCircle size={16} color="#16A34A" />
            <Text style={styles.instructionText}>
              Keep your phone sound/vibration ON to receive the turn calling chime.
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <CheckCircle size={16} color="#16A34A" />
            <Text style={styles.instructionText}>
              Please report to the reception desk 10 minutes before your estimated time.
            </Text>
          </View>
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
  callingAlert: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callingAlertTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  callingAlertSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  queueVisualizerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visualizerBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  myTokenBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#0F52BA',
  },
  dividerArrow: {
    paddingHorizontal: 8,
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  currentNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
  },
  boxSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  estCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  estLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  estValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F52BA',
    marginTop: 2,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
