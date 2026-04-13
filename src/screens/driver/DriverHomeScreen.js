// src/screens/driver/DriverHomeScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Switch, ScrollView,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { driverScheduler } from '../../services/DriverScheduler';

const CHENNAI = { latitude: 13.0827, longitude: 80.2707, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function DriverHomeScreen({ navigation }) {
  const { user, driverStatus, setDriverStatus, pendingRideRequest, setPendingRideRequest, showToast } = useAppStore();
  const [isOnline, setIsOnline] = useState(driverStatus === 'online');
  const [incomingRide, setIncomingRide] = useState(null);
  const rideCardAnim = useRef(new Animated.Value(0)).current;
  const statusPulse = useRef(new Animated.Value(1)).current;

  const toggleOnline = (val) => {
    setIsOnline(val);
    const status = val ? 'online' : 'offline';
    setDriverStatus(status);
    driverScheduler.setDriverStatus(user?.id || 'driver_1', val ? 'idle' : 'offline');

    if (val) {
      showToast('You are now online and accepting rides', 'success');
      startStatusPulse();
      simulateIncomingRide();
    } else {
      showToast('You are now offline', 'info');
      statusPulse.stopAnimation();
      statusPulse.setValue(1);
    }
  };

  const startStatusPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(statusPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const simulateIncomingRide = () => {
    setTimeout(() => {
      const mockRide = {
        id: `RIDE_${Date.now()}`,
        passenger: 'Alex K.',
        rating: 4.8,
        pickup: 'Anna Nagar, 2nd Ave',
        dropoff: 'T. Nagar Bus Stand',
        distance: 6.4,
        fare: 145,
        type: 'Mini',
        etaToPickup: 4,
      };
      setIncomingRide(mockRide);
      Animated.spring(rideCardAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    }, 5000);
  };

  const handleAccept = () => {
    if (!incomingRide) return;
    Animated.timing(rideCardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      navigation.navigate('RideAccept', { rideData: incomingRide });
      setIncomingRide(null);
    });
  };

  const handleDecline = () => {
    Animated.timing(rideCardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIncomingRide(null);
      showToast('Ride declined', 'info');
    });
  };

  const statusColor = isOnline ? Colors.driverOnline : Colors.driverOffline;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <MapView style={styles.map} initialRegion={CHENNAI} customMapStyle={darkMapStyle}>
        <Marker coordinate={CHENNAI} title="Your Location">
          <View style={[styles.driverMarker, { borderColor: statusColor }]}>
            <Text style={{ fontSize: 18 }}>🚗</Text>
          </View>
        </Marker>
        {isOnline && (
          <Circle
            center={CHENNAI}
            radius={1500}
            fillColor={`${statusColor}10`}
            strokeColor={`${statusColor}40`}
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, transform: [{ scale: isOnline ? statusPulse : 1 }] }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ false: Colors.border, true: Colors.driverOnline + '60' }}
          thumbColor={isOnline ? Colors.driverOnline : Colors.textMuted}
        />
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Driver quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Today's Earnings", value: '₹842', icon: '💰' },
            { label: 'Trips Done', value: '7', icon: '🛣️' },
            { label: 'Rating', value: '4.9', icon: '⭐' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* OS Queue status */}
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>⚙️ MLFQ Scheduler Status</Text>
          <View style={styles.queueRow}>
            {[
              { label: 'Q0 Emergency', count: 0, color: Colors.danger },
              { label: 'Q1 Scheduled', count: 2, color: Colors.warning },
              { label: 'Q2 Regular', count: 5, color: Colors.textSecondary },
            ].map((q) => (
              <View key={q.label} style={styles.queueItem}>
                <Text style={[styles.queueCount, { color: q.color }]}>{q.count}</Text>
                <Text style={styles.queueLabel}>{q.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.queueNote}>
            {isOnline
              ? '✅ You\'re in the idle pool — rides will be assigned based on proximity & aging priority'
              : '⏸ Go online to join the driver pool'}
          </Text>
        </View>

        {!isOnline && (
          <View style={styles.offlineMsg}>
            <Text style={styles.offlineMsgEmoji}>😴</Text>
            <Text style={styles.offlineMsgText}>Toggle online to start accepting rides</Text>
          </View>
        )}
      </View>

      {/* Incoming ride card */}
      {incomingRide && (
        <Animated.View style={[styles.incomingCard, {
          transform: [{
            translateY: rideCardAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] })
          }]
        }]}>
          <View style={styles.incomingHeader}>
            <Text style={styles.incomingTitle}>🆕 New Ride Request</Text>
            <Text style={styles.incomingType}>{incomingRide.type}</Text>
          </View>
          <View style={styles.incomingRow}>
            <Text style={styles.incomingLabel}>Passenger</Text>
            <Text style={styles.incomingValue}>{incomingRide.passenger} ⭐{incomingRide.rating}</Text>
          </View>
          <View style={styles.incomingRow}>
            <Text style={styles.incomingLabel}>Pickup</Text>
            <Text style={styles.incomingValue}>{incomingRide.pickup}</Text>
          </View>
          <View style={styles.incomingRow}>
            <Text style={styles.incomingLabel}>Dropoff</Text>
            <Text style={styles.incomingValue}>{incomingRide.dropoff}</Text>
          </View>
          <View style={styles.incomingRow}>
            <Text style={styles.incomingLabel}>Distance</Text>
            <Text style={styles.incomingValue}>{incomingRide.distance} km</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.incomingFare}>₹{incomingRide.fare}</Text>
            <Text style={styles.incomingEta}>{incomingRide.etaToPickup} min to pickup</Text>
          </View>
          <View style={styles.semNote}>
            <Text style={styles.semNoteText}>🔒 Accepting acquires ride semaphore — commits you to the ride</Text>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptBtnText}>Accept Ride</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  driverMarker: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 6,
    borderWidth: 2,
  },
  topBar: {
    position: 'absolute', top: 56, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.9)', padding: 12, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontFamily: Typography.heading, letterSpacing: 1 },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 36, borderTopWidth: 1, borderColor: Colors.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 16, fontFamily: Typography.heading, color: Colors.textPrimary },
  statLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center' },
  queueCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  queueTitle: { fontSize: 12, fontFamily: Typography.bodyBold, color: Colors.accent, marginBottom: 12 },
  queueRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  queueItem: { alignItems: 'center' },
  queueCount: { fontSize: 24, fontFamily: Typography.heading },
  queueLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center' },
  queueNote: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, lineHeight: 15 },
  offlineMsg: { alignItems: 'center', paddingVertical: 8 },
  offlineMsgEmoji: { fontSize: 32, marginBottom: 4 },
  offlineMsgText: { fontSize: 13, fontFamily: Typography.body, color: Colors.textMuted },
  incomingCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40,
    borderTopWidth: 2, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  incomingHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  incomingTitle: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  incomingType: {
    backgroundColor: Colors.primaryGlow, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, fontSize: 12, fontFamily: Typography.bodyBold, color: Colors.primary,
  },
  incomingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  incomingLabel: { fontSize: 12, fontFamily: Typography.body, color: Colors.textMuted },
  incomingValue: { fontSize: 13, fontFamily: Typography.bodyMedium, color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: Colors.border },
  incomingFare: { fontSize: 28, fontFamily: Typography.heading, color: Colors.primary },
  incomingEta: { fontSize: 12, fontFamily: Typography.body, color: Colors.textMuted },
  semNote: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: 8, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  semNoteText: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  actionBtns: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  declineBtnText: { fontSize: 15, fontFamily: Typography.bodyBold, color: Colors.textSecondary },
  acceptBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 15, fontFamily: Typography.bodyBold, color: Colors.background },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A6A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C27' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1B2A' }] },
];
