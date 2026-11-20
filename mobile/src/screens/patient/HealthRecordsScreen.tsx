import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Plus,
  Calendar,
  Share2,
  FolderOpen,
  Building2,
} from 'lucide-react-native';

const CATEGORIES = ['All', 'Prescription', 'Lab Test', 'Consultation', 'Scan & X-Ray'];

export const HealthRecordsScreen: React.FC = () => {
  const { records, addRecord } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filtered = records.filter(
    (r) => selectedCategory === 'All' || r.category === selectedCategory
  );

  const handleUploadDummy = () => {
    Alert.alert(
      'Upload Health Record',
      'Choose a file to attach from camera or phone storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Prescription Demo',
          onPress: () => {
            addRecord({
              name: 'Dr. Consultation Prescription',
              category: 'Prescription',
              doctor: 'Dr. Gaurav Boga',
              hospital: 'Gandi Hospital',
              date: new Date().toLocaleDateString('en-GB'),
              fileType: 'PDF',
              fileName: `Prescription_${Date.now()}.pdf`,
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Health Records Vault</Text>
          <Text style={styles.headerSubtitle}>
            Securely store & access prescriptions & lab reports
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleUploadDummy}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.catRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.catChip,
                selectedCategory === item && styles.catChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.catText,
                  selectedCategory === item && styles.catTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Records List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FolderOpen size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySub}>
              Upload your digital prescriptions and medical lab tests here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.recordCard}>
            <View style={styles.iconBox}>
              <FileText size={24} color="#0F52BA" />
            </View>
            <View style={styles.recInfo}>
              <Text style={styles.recName}>{item.name}</Text>
              <Text style={styles.recCategory}>{item.category}</Text>
              <View style={styles.meta}>
                <Building2 size={12} color="#64748B" />
                <Text style={styles.metaText}>{item.hospital}</Text>
              </View>
              <View style={styles.meta}>
                <Calendar size={12} color="#64748B" />
                <Text style={styles.metaText}>{item.date}</Text>
              </View>
            </View>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addBtn: {
    backgroundColor: '#0F52BA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  catRow: {
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#0F52BA',
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recInfo: {
    marginLeft: 12,
    flex: 1,
  },
  recName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  recCategory: {
    fontSize: 12,
    color: '#0F52BA',
    fontWeight: '600',
    marginTop: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
