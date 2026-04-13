// src/screens/passenger/ProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';

export default function ProfileScreen({ navigation }) {
  const { user, setUserRole, emergencyContacts } = useAppStore();

  const menuItems = [
    { icon: '🚨', label: 'Emergency Contacts', sub: `${emergencyContacts.length} contacts`, action: () => {} },
    { icon: '💳', label: 'Payment Methods', sub: 'UPI, Card', action: () => {} },
    { icon: '⚙️', label: 'OS Dashboard', sub: 'View scheduler & memory stats', action: () => navigation.navigate('OS') },
    { icon: '🔔', label: 'Notifications', sub: 'All alerts on', action: () => {} },
    { icon: '🛡️', label: 'Privacy & Safety', sub: 'Location, SOS settings', action: () => {} },
    { icon: '❓', label: 'Help & Support', sub: 'FAQs, chat support', action: () => {} },
    { icon: '🔄', label: 'Switch to Driver', sub: 'Start earning', action: () => { setUserRole('driver'); navigation.replace('DriverApp'); } },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userId}>ID: {user?.id}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>🧑‍💼 Passenger</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Trips', value: '24' },
            { label: 'Rating Given', value: '4.9' },
            { label: 'Saved', value: '₹340' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.action} activeOpacity={0.75}>
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
  header: {
    paddingTop: 64, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 28, fontFamily: Typography.heading, color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  userCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryGlow, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontFamily: Typography.heading, color: Colors.primary },
  userName: { fontSize: 20, fontFamily: Typography.heading, color: Colors.textPrimary },
  userId: { fontSize: 11, fontFamily: Typography.mono || 'monospace', color: Colors.textMuted, marginTop: 2 },
  roleBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  roleText: { fontSize: 11, fontFamily: Typography.bodyMedium, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statBox: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 20, fontFamily: Typography.heading, color: Colors.primary },
  statLabel: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 2 },
  menuItem: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: Typography.bodyMedium, color: Colors.textPrimary },
  menuSub: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 2 },
  menuArrow: { fontSize: 20, color: Colors.textMuted },
  logoutBtn: {
    marginTop: 16, marginBottom: 40,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
  },
  logoutText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textMuted },
});
