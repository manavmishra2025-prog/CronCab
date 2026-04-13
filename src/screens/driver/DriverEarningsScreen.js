// src/screens/driver/DriverEarningsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

const WEEKLY_DATA = [
  { day: 'Mon', trips: 8, earnings: 720 },
  { day: 'Tue', trips: 12, earnings: 1100 },
  { day: 'Wed', trips: 6, earnings: 540 },
  { day: 'Thu', trips: 10, earnings: 930 },
  { day: 'Fri', trips: 15, earnings: 1450 },
  { day: 'Sat', trips: 18, earnings: 1860 },
  { day: 'Sun', trips: 7, earnings: 842 },
];

const maxEarnings = Math.max(...WEEKLY_DATA.map((d) => d.earnings));

export default function DriverEarningsScreen() {
  const totalWeek = WEEKLY_DATA.reduce((s, d) => s + d.earnings, 0);
  const totalTrips = WEEKLY_DATA.reduce((s, d) => s + d.trips, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.subtitle}>This Week</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.primaryCard]}>
            <Text style={styles.summaryEmoji}>💰</Text>
            <Text style={styles.summaryValue}>₹{totalWeek.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🛣️</Text>
            <Text style={styles.summaryValue}>{totalTrips}</Text>
            <Text style={styles.summaryLabel}>Trips</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>⏱️</Text>
            <Text style={styles.summaryValue}>38h</Text>
            <Text style={styles.summaryLabel}>Online</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Earnings</Text>
          <View style={styles.chart}>
            {WEEKLY_DATA.map((d) => {
              const height = Math.max(8, (d.earnings / maxEarnings) * 100);
              const isToday = d.day === 'Sun';
              return (
                <View key={d.day} style={styles.barCol}>
                  <Text style={styles.barValue}>₹{(d.earnings / 1000).toFixed(1)}k</Text>
                  <View style={[styles.bar, { height, backgroundColor: isToday ? Colors.primary : Colors.surfaceElevated, borderColor: isToday ? Colors.primary : Colors.border }]} />
                  <Text style={[styles.barDay, isToday && { color: Colors.primary }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Daily breakdown */}
        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        {WEEKLY_DATA.map((d) => (
          <View key={d.day} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{d.day}</Text>
            <Text style={styles.dayTrips}>{d.trips} trips</Text>
            <Text style={styles.dayEarnings}>₹{d.earnings}</Text>
          </View>
        ))}

        {/* OS note */}
        <View style={styles.osCard}>
          <Text style={styles.osCardTitle}>⚙️ Aging Algorithm — Fair Earnings</Text>
          <Text style={styles.osCardText}>
            Your idle time is tracked by the MLFQ aging system. The longer you wait without a ride, the higher your priority — guaranteeing you get the next available request. This prevents experienced drivers from being starved of rides.
          </Text>
        </View>
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
  subtitle: { fontSize: 13, fontFamily: Typography.body, color: Colors.textMuted },
  scroll: { padding: Spacing.lg },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  primaryCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  summaryEmoji: { fontSize: 20, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  summaryLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  chartCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  chartTitle: { fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.textSecondary, marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 8, fontFamily: Typography.body, color: Colors.textMuted, marginBottom: 4 },
  bar: { width: 24, borderRadius: 4, borderWidth: 1, marginBottom: 6 },
  barDay: { fontSize: 10, fontFamily: Typography.bodyMedium, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 12, fontFamily: Typography.bodyBold, color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.md,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.border,
  },
  dayLabel: { fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textPrimary, width: 40 },
  dayTrips: { fontSize: 12, fontFamily: Typography.body, color: Colors.textMuted, flex: 1, textAlign: 'center' },
  dayEarnings: { fontSize: 15, fontFamily: Typography.heading, color: Colors.primary },
  osCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md, marginBottom: 40,
  },
  osCardTitle: { fontSize: 13, fontFamily: Typography.bodyBold, color: Colors.accent, marginBottom: 8 },
  osCardText: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, lineHeight: 19 },
});
