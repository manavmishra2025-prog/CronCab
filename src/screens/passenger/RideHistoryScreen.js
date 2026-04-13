// src/screens/passenger/RideHistoryScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';

const MOCK_HISTORY = [
  { id: 'RIDE_1001', date: 'Today, 9:14 AM', from: 'Anna Nagar', to: 'T. Nagar', fare: 185, type: 'Mini', state: 'COMPLETED', driver: 'Arjun K.', rating: 5, surge: 1.2 },
  { id: 'RIDE_998', date: 'Yesterday, 7:45 PM', from: 'Adyar', to: 'Airport', fare: 420, type: 'Prime', state: 'COMPLETED', driver: 'Priya S.', rating: 5, surge: 1.0 },
  { id: 'RIDE_992', date: 'Mon, 11:30 AM', from: 'Velachery', to: 'OMR', fare: 130, type: 'Moto', state: 'CANCELLED', driver: null, rating: null, surge: 1.5 },
  { id: 'RIDE_985', date: 'Sun, 3:00 PM', from: 'Nungambakkam', to: 'Guindy', fare: 220, type: 'Mini', state: 'COMPLETED', driver: 'Vikram P.', rating: 4, surge: 1.0 },
];

const stateColor = (s) => s === 'COMPLETED' ? Colors.success : s === 'CANCELLED' ? Colors.danger : Colors.warning;

export default function RideHistoryScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Your Rides</Text>
        <Text style={styles.subtitle}>{MOCK_HISTORY.length} total trips</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {MOCK_HISTORY.map((ride) => (
          <TouchableOpacity key={ride.id} style={styles.rideCard} activeOpacity={0.8}>
            <View style={styles.rideTop}>
              <View style={styles.rideLeft}>
                <Text style={styles.rideType}>{ride.type}</Text>
                <Text style={styles.rideDate}>{ride.date}</Text>
              </View>
              <View style={styles.rideRight}>
                <Text style={styles.rideFare}>₹{ride.fare}</Text>
                {ride.surge > 1 && (
                  <Text style={styles.rideSurge}>{ride.surge}x surge</Text>
                )}
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
              </View>
              <View style={styles.routeLabels}>
                <Text style={styles.routeText}>{ride.from}</Text>
                <Text style={styles.routeText}>{ride.to}</Text>
              </View>
            </View>

            <View style={styles.rideBottom}>
              <View style={[styles.stateBadge, { borderColor: stateColor(ride.state) }]}>
                <Text style={[styles.stateText, { color: stateColor(ride.state) }]}>
                  {ride.state}
                </Text>
              </View>
              {ride.driver && (
                <Text style={styles.driverText}>with {ride.driver}</Text>
              )}
              {ride.rating && (
                <Text style={styles.ratingText}>{'⭐'.repeat(ride.rating)}</Text>
              )}
            </View>

            {/* OS checkpoint info */}
            <View style={styles.checkpointBadge}>
              <Text style={styles.checkpointText}>💾 FSM checkpointed · Semaphore released</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  subtitle: { fontSize: 13, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 4 },
  scroll: { padding: Spacing.lg },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  rideLeft: {},
  rideType: { fontSize: 16, fontFamily: Typography.heading, color: Colors.textPrimary },
  rideDate: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  rideRight: { alignItems: 'flex-end' },
  rideFare: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  rideSurge: { fontSize: 10, fontFamily: Typography.body, color: Colors.warning },
  routeRow: { flexDirection: 'row', marginBottom: Spacing.sm, gap: 10 },
  routeDots: { alignItems: 'center', paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 1, height: 16, backgroundColor: Colors.border, marginVertical: 2 },
  routeLabels: { justifyContent: 'space-between', height: 36 },
  routeText: { fontSize: 13, fontFamily: Typography.bodyMedium, color: Colors.textSecondary },
  rideBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stateBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1,
  },
  stateText: { fontSize: 10, fontFamily: Typography.bodyBold },
  driverText: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  ratingText: { fontSize: 11 },
  checkpointBadge: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border,
  },
  checkpointText: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
});
