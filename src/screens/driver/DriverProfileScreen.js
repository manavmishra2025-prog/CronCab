// src/screens/driver/DriverProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';

export default function DriverProfileScreen({ navigation }) {
  const { user, driverRating, setUserRole } = useAppStore();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Driver Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Driver'}</Text>
          <Text style={styles.id}>{user?.id}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingBig}>⭐ {driverRating}</Text>
            <Text style={styles.ratingLabel}>Overall Rating</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Total Trips', value: '1,284', icon: '🛣️' },
            { label: 'Acceptance Rate', value: '92%', icon: '✅' },
            { label: 'Completion Rate', value: '98%', icon: '🏁' },
            { label: 'Total Earned', value: '₹1.2L', icon: '💰' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {[
          { icon: '🚗', label: 'My Vehicle', sub: 'Maruti Swift · TN09 AB 1234' },
          { icon: '📄', label: 'Documents', sub: 'All verified ✓' },
          { icon: '⚙️', label: 'OS Dashboard', sub: 'Scheduler & allocator stats', action: () => navigation.navigate('OS') },
          { icon: '🆘', label: 'Emergency SOS', sub: 'Driver safety settings', action: () => navigation.navigate('SOS') },
          { icon: '🔄', label: 'Switch to Passenger', sub: 'Book rides', action: () => { setUserRole('passenger'); navigation.replace('PassengerApp'); } },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.action || (() => {})} activeOpacity={0.75}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Onboarding')}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 64, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderColor: Colors.border },
  title: { fontSize: 28, fontFamily: Typography.heading, color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryGlow,
    borderWidth: 3, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontFamily: Typography.heading, color: Colors.primary },
  name: { fontSize: 22, fontFamily: Typography.heading, color: Colors.textPrimary },
  id: { fontSize: 11, fontFamily: Typography.mono || 'monospace', color: Colors.textMuted, marginTop: 4 },
  ratingRow: { alignItems: 'center', marginTop: 12 },
  ratingBig: { fontSize: 28, fontFamily: Typography.heading, color: Colors.textPrimary },
  ratingLabel: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
  statBox: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  statLabel: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  menuItem: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: Typography.bodyMedium, color: Colors.textPrimary },
  menuSub: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 2 },
  menuArrow: { fontSize: 20, color: Colors.textMuted },
  logoutBtn: { marginTop: 16, marginBottom: 40, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md },
  logoutText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textMuted },
});
