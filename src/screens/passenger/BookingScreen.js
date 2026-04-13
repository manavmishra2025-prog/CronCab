// src/screens/passenger/BookingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius, RideTypes } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { rideService } from '../../services/RideService';
import { RideState } from '../../services/RideStateManager';

export default function BookingScreen({ route, navigation }) {
  const { pickup, dropoffText, selectedType: initialType } = route.params || {};
  const { user, setActiveRide, showToast } = useAppStore();

  const [selectedType, setSelectedType] = useState(initialType || 'mini');
  const [estimates, setEstimates] = useState({});
  const [isBooking, setIsBooking] = useState(false);
  const [bookingState, setBookingState] = useState('idle'); // idle | searching | found | error
  const [foundDriver, setFoundDriver] = useState(null);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Get estimates for all ride types
    const est = {};
    RideTypes.forEach((rt) => {
      const dropoff = { latitude: pickup.latitude + 0.04, longitude: pickup.longitude + 0.03 };
      est[rt.id] = rideService.getEstimate(pickup, dropoff, rt.id);
    });
    setEstimates(est);
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleBook = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setBookingState('searching');
    startPulse();

    try {
      const dropoff = { latitude: pickup.latitude + 0.04, longitude: pickup.longitude + 0.03 };
      const result = await rideService.bookRide({
        userId: user.id,
        pickup,
        dropoff,
        rideClass: selectedType,
      });

      if (!result.success) {
        setBookingState('error');
        showToast(`Booking failed: ${result.reason}`, 'error');
        return;
      }

      setFoundDriver(result.driver);
      setBookingState('found');
      setActiveRide(result);

      setTimeout(() => {
        navigation.replace('RideTracking', { rideData: result });
      }, 2000);

    } catch (err) {
      setBookingState('error');
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  const currentEst = estimates[selectedType];
  const surgeColor = (m) => m <= 1 ? Colors.success : m <= 1.5 ? Colors.warning : Colors.danger;

  if (bookingState === 'searching') {
    return (
      <View style={styles.searchingContainer}>
        <StatusBar style="light" />
        <Animated.View style={[styles.searchPulse, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.searchEmoji}>🔍</Text>
        </Animated.View>
        <Text style={styles.searchTitle}>Finding your driver</Text>
        <Text style={styles.searchSub}>
          Multi-Level Queue Scheduler working...{'\n'}Checking driver availability with Banker's Algorithm
        </Text>
        <View style={styles.osProcess}>
          <Text style={styles.osProcessText}>{'> Enqueueing in Q1 (mini priority)...'}</Text>
          <Text style={styles.osProcessText}>{'> Checking safe state allocation...'}</Text>
          <Text style={styles.osProcessText}>{'> Acquiring request mutex...'}</Text>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  if (bookingState === 'found' && foundDriver) {
    return (
      <View style={styles.foundContainer}>
        <StatusBar style="light" />
        <Text style={styles.foundEmoji}>🎉</Text>
        <Text style={styles.foundTitle}>Driver Found!</Text>
        <Text style={styles.foundDriverName}>{foundDriver.name}</Text>
        <Text style={styles.foundVehicle}>{foundDriver.vehicleModel}</Text>
        <Text style={styles.foundPlate}>{foundDriver.vehicleNumber}</Text>
        <Text style={styles.foundEta}>Arriving in ~{foundDriver.etaMinutes} min</Text>
        <View style={styles.osProcess}>
          <Text style={styles.osProcessText}>{'> Ride lock acquired (Semaphore P())'}</Text>
          <Text style={styles.osProcessText}>{'> State: SEARCHING → DRIVER_ASSIGNED'}</Text>
          <Text style={[styles.osProcessText, { color: Colors.success }]}>{'> Checkpoint saved ✓'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Ride</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Route info */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.routeText}>Current Location</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.routeText}>{dropoffText}</Text>
          </View>
        </View>

        {/* Ride type cards */}
        <Text style={styles.sectionTitle}>Select Ride Type</Text>
        {RideTypes.map((rt) => {
          const est = estimates[rt.id];
          const isSelected = selectedType === rt.id;
          return (
            <TouchableOpacity
              key={rt.id}
              style={[styles.rideCard, isSelected && styles.rideCardSelected]}
              onPress={() => setSelectedType(rt.id)}
              activeOpacity={0.85}
            >
              <View style={styles.rideCardLeft}>
                <Text style={styles.rideCardEmoji}>{rt.emoji}</Text>
                <View>
                  <Text style={[styles.rideCardLabel, isSelected && { color: Colors.primary }]}>
                    {rt.label}
                  </Text>
                  <Text style={styles.rideCardDesc}>{rt.description}</Text>
                  <Text style={styles.rideCardCapacity}>👥 Up to {rt.capacity}</Text>
                </View>
              </View>
              <View style={styles.rideCardRight}>
                {est && (
                  <>
                    <Text style={styles.rideCardPrice}>₹{est.totalFare}</Text>
                    <Text style={styles.rideCardEta}>{rt.eta}</Text>
                    {est.surgeMultiplier > 1 && (
                      <View style={[styles.surgeBadge, { backgroundColor: surgeColor(est.surgeMultiplier) + '22' }]}>
                        <Text style={[styles.surgeText, { color: surgeColor(est.surgeMultiplier) }]}>
                          {est.surgeMultiplier}x
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Surge info card */}
        {currentEst && currentEst.surgeMultiplier > 1 && (
          <View style={styles.surgeInfoCard}>
            <Text style={styles.surgeInfoTitle}>⚠️ Surge Pricing Active</Text>
            <Text style={styles.surgeInfoDesc}>
              {Math.round(currentEst.zoneUtilization)}% of drivers in your zone are busy.{'\n'}
              Banker's Algorithm has confirmed the system is in a safe state.{'\n'}
              Surge: {currentEst.surgeMultiplier}x — prices normalize when demand drops.
            </Text>
          </View>
        )}

        {/* OS badge */}
        <View style={styles.osBadgeRow}>
          <View style={styles.osBadge}><Text style={styles.osBadgeText}>⚙️ MLFQ Scheduler</Text></View>
          <View style={styles.osBadge}><Text style={styles.osBadgeText}>🔒 Semaphore Lock</Text></View>
          <View style={styles.osBadge}><Text style={styles.osBadgeText}>💾 Checkpointed</Text></View>
        </View>
      </ScrollView>

      {/* Book button */}
      <View style={styles.footer}>
        {currentEst && (
          <Text style={styles.totalFare}>
            Total: ₹{currentEst.totalFare}
            {currentEst.surgeMultiplier > 1 && (
              <Text style={{ color: Colors.warning }}> ({currentEst.surgeMultiplier}x surge)</Text>
            )}
          </Text>
        )}
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Text style={styles.bookBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.textPrimary },
  headerTitle: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  scroll: { padding: Spacing.lg, paddingBottom: 120 },
  routeCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textPrimary },
  routeLine: {
    width: 1, height: 20, backgroundColor: Colors.border, marginLeft: 5, marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 13, fontFamily: Typography.bodyBold, color: Colors.textMuted,
    letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase',
  },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rideCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  rideCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rideCardEmoji: { fontSize: 32 },
  rideCardLabel: { fontSize: 16, fontFamily: Typography.heading, color: Colors.textPrimary },
  rideCardDesc: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, marginTop: 2 },
  rideCardCapacity: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 2 },
  rideCardRight: { alignItems: 'flex-end' },
  rideCardPrice: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  rideCardEta: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  surgeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, marginTop: 4 },
  surgeText: { fontSize: 11, fontFamily: Typography.bodyBold },
  surgeInfoCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '44',
    marginVertical: Spacing.md,
  },
  surgeInfoTitle: { fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.warning, marginBottom: 8 },
  surgeInfoDesc: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, lineHeight: 19 },
  osBadgeRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.md, flexWrap: 'wrap' },
  osBadge: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  osBadgeText: { fontSize: 10, fontFamily: Typography.bodyMedium, color: Colors.textMuted },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, padding: Spacing.lg,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  totalFare: {
    fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textSecondary, marginBottom: 12,
  },
  bookBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  bookBtnText: { fontSize: 16, fontFamily: Typography.bodyBold, color: Colors.background },

  // Searching state
  searchingContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  searchPulse: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary, marginBottom: Spacing.xl,
  },
  searchEmoji: { fontSize: 40 },
  searchTitle: { fontSize: 24, fontFamily: Typography.heading, color: Colors.textPrimary, marginBottom: 12 },
  searchSub: {
    fontSize: 13, fontFamily: Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl,
  },
  osProcess: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignSelf: 'stretch',
  },
  osProcessText: {
    fontSize: 11, fontFamily: Typography.mono || 'monospace',
    color: Colors.textMuted, marginBottom: 4,
  },

  // Found state
  foundContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  foundEmoji: { fontSize: 60, marginBottom: 20 },
  foundTitle: { fontSize: 28, fontFamily: Typography.heading, color: Colors.success, marginBottom: 8 },
  foundDriverName: { fontSize: 22, fontFamily: Typography.heading, color: Colors.textPrimary },
  foundVehicle: { fontSize: 14, fontFamily: Typography.body, color: Colors.textSecondary, marginTop: 4 },
  foundPlate: {
    fontSize: 16, fontFamily: Typography.bodyBold, color: Colors.primary,
    marginTop: 8, letterSpacing: 2,
  },
  foundEta: { fontSize: 14, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 8, marginBottom: 24 },
});
