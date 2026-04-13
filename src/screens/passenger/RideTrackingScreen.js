// src/screens/passenger/RideTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { rideService } from '../../services/RideService';
import { RideState, STATE_METADATA } from '../../services/RideStateManager';

const RIDE_FLOW = [
  RideState.DRIVER_ASSIGNED,
  RideState.EN_ROUTE_TO_PICKUP,
  RideState.ARRIVED_AT_PICKUP,
  RideState.IN_RIDE,
  RideState.COMPLETING,
  RideState.COMPLETED,
];

export default function RideTrackingScreen({ route, navigation }) {
  const { rideData } = route.params || {};
  const { user, activeRide, sosActive, emergencyContacts, showToast, setSosActive } = useAppStore();
  const [currentState, setCurrentState] = useState(RideState.DRIVER_ASSIGNED);
  const [stateIndex, setStateIndex] = useState(0);
  const [driverLocation, setDriverLocation] = useState({
    latitude: rideData?.driver?.location?.latitude || 13.088,
    longitude: rideData?.driver?.location?.longitude || 80.27,
  });
  const [checkpointLog, setCheckpointLog] = useState([]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rideId = rideData?.rideId;
  const driver = rideData?.driver;

  // Simulate ride progression through states
  useEffect(() => {
    const intervals = [4000, 8000, 5000, 12000, 3000];
    let idx = stateIndex;

    const advance = () => {
      if (idx >= RIDE_FLOW.length - 1) return;
      idx++;
      const newState = RIDE_FLOW[idx];
      setCurrentState(newState);
      setStateIndex(idx);

      const meta = STATE_METADATA[newState];
      setCheckpointLog((prev) => [
        { state: newState, label: meta.label, time: new Date().toLocaleTimeString(), icon: meta.icon },
        ...prev,
      ]);

      Animated.timing(progressAnim, {
        toValue: idx / (RIDE_FLOW.length - 1),
        duration: 500,
        useNativeDriver: false,
      }).start();

      // Simulate driver location update
      setDriverLocation((prev) => ({
        latitude: prev.latitude + (Math.random() - 0.5) * 0.003,
        longitude: prev.longitude + (Math.random() - 0.5) * 0.003,
      }));

      if (newState === RideState.COMPLETED) {
        showToast('Ride completed! ⭐ Rate your driver', 'success');
        setTimeout(() => navigation.replace('PassengerApp'), 4000);
      }
    };

    let accumulated = 0;
    const timers = intervals.map((delay, i) => {
      accumulated += delay;
      return setTimeout(advance, accumulated);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSOS = async () => {
    setSosActive(true);
    await rideService.triggerSOS({
      userId: user.id,
      rideId,
      location: driverLocation,
      emergencyContacts,
    });
    navigation.navigate('SOS', { rideId, driverLocation });
  };

  const meta = STATE_METADATA[currentState] || {};
  const isCompleted = currentState === RideState.COMPLETED;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <MapView
        style={styles.map}
        region={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        customMapStyle={darkMapStyle}
      >
        {/* Driver marker */}
        <Marker coordinate={driverLocation} title={driver?.name}>
          <View style={styles.driverMarker}>
            <Text style={{ fontSize: 20 }}>🚗</Text>
          </View>
        </Marker>

        {/* Passenger pickup */}
        <Marker
          coordinate={{ latitude: 13.0827, longitude: 80.2707 }}
          title="Your location"
        >
          <View style={styles.pickupMarker} />
        </Marker>

        {/* Route line */}
        <Polyline
          coordinates={[
            driverLocation,
            { latitude: 13.0827, longitude: 80.2707 },
          ]}
          strokeColor={Colors.primary}
          strokeWidth={3}
          lineDashPattern={[8, 4]}
        />
      </MapView>

      {/* Top overlay: state + SOS */}
      <View style={styles.topBar}>
        <View style={[styles.stateBadge, { borderColor: meta.color }]}>
          <Text style={styles.stateIcon}>{meta.icon}</Text>
          <Text style={[styles.stateLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
          <Text style={styles.sosBtnText}>🆘 SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]}
        />
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Driver info */}
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {driver?.name?.charAt(0) || 'D'}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver?.name || 'Your Driver'}</Text>
            <Text style={styles.driverVehicle}>{driver?.vehicleModel}</Text>
            <Text style={styles.driverPlate}>{driver?.vehicleNumber}</Text>
          </View>
          <View style={styles.driverRating}>
            <Text style={styles.ratingValue}>⭐ {driver?.rating}</Text>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ride state progress steps */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsRow}>
          {RIDE_FLOW.slice(0, -1).map((state, i) => {
            const m = STATE_METADATA[state];
            const done = i < stateIndex;
            const active = i === stateIndex;
            return (
              <View key={state} style={styles.step}>
                <View style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}>
                  <Text style={styles.stepDotIcon}>{done ? '✓' : m?.icon}</Text>
                </View>
                <Text style={[styles.stepLabel, active && { color: Colors.primary }]} numberOfLines={2}>
                  {m?.label?.split(' ').slice(0, 2).join('\n')}
                </Text>
                {i < RIDE_FLOW.length - 2 && (
                  <View style={[styles.stepConnector, done && styles.stepConnectorDone]} />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* OS checkpoint log */}
        <View style={styles.checkpointBox}>
          <Text style={styles.checkpointTitle}>💾 FSM Checkpoints (OS Recovery Log)</Text>
          {checkpointLog.length === 0 ? (
            <Text style={styles.checkpointEmpty}>Checkpoints will appear as ride progresses...</Text>
          ) : (
            checkpointLog.slice(0, 4).map((c, i) => (
              <View key={i} style={styles.checkpointRow}>
                <Text style={styles.checkpointIcon}>{c.icon}</Text>
                <Text style={styles.checkpointLabel}>{c.label}</Text>
                <Text style={styles.checkpointTime}>{c.time}</Text>
              </View>
            ))
          )}
        </View>

        {/* Fare info */}
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareValue}>₹{rideData?.fare?.total || '--'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  driverMarker: {
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 4, borderWidth: 2, borderColor: Colors.primary,
  },
  pickupMarker: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.accent,
    borderWidth: 2, borderColor: '#fff',
  },
  topBar: {
    position: 'absolute', top: 56, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  stateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,10,15,0.9)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
  },
  stateIcon: { fontSize: 16 },
  stateLabel: { fontSize: 13, fontFamily: Typography.bodyBold },
  sosBtn: {
    backgroundColor: Colors.danger, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    shadowColor: Colors.danger, shadowOpacity: 0.7, shadowRadius: 8, elevation: 5,
  },
  sosBtnText: { fontSize: 13, fontFamily: Typography.bodyBold, color: '#fff' },
  progressBg: { height: 3, backgroundColor: Colors.border },
  progressFill: { height: 3, backgroundColor: Colors.primary },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, borderTopWidth: 1, borderColor: Colors.border,
  },
  driverRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md,
    paddingBottom: Spacing.md, borderBottomWidth: 1, borderColor: Colors.border,
  },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryGlow, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  driverAvatarText: { fontSize: 20, fontFamily: Typography.heading, color: Colors.primary },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontFamily: Typography.heading, color: Colors.textPrimary },
  driverVehicle: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary },
  driverPlate: { fontSize: 13, fontFamily: Typography.bodyBold, color: Colors.primary, letterSpacing: 1 },
  driverRating: { alignItems: 'flex-end', gap: 8 },
  ratingValue: { fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.textPrimary },
  callBtn: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  callBtnText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: Colors.textSecondary },
  stepsRow: { marginBottom: Spacing.md },
  step: { alignItems: 'center', width: 70, marginRight: 4, position: 'relative' },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepDotDone: { backgroundColor: Colors.success + '22', borderColor: Colors.success },
  stepDotActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  stepDotIcon: { fontSize: 12 },
  stepLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center' },
  stepConnector: {
    position: 'absolute', top: 16, right: -18, width: 20, height: 1,
    backgroundColor: Colors.border,
  },
  stepConnectorDone: { backgroundColor: Colors.success },
  checkpointBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  checkpointTitle: { fontSize: 10, fontFamily: Typography.bodyBold, color: Colors.textMuted, marginBottom: 6 },
  checkpointEmpty: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted },
  checkpointRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  checkpointIcon: { fontSize: 10 },
  checkpointLabel: { flex: 1, fontSize: 10, fontFamily: Typography.body, color: Colors.textSecondary },
  checkpointTime: { fontSize: 9, fontFamily: Typography.mono || 'monospace', color: Colors.textMuted },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  fareLabel: { fontSize: 13, fontFamily: Typography.body, color: Colors.textSecondary },
  fareValue: { fontSize: 20, fontFamily: Typography.heading, color: Colors.primary },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A6A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C27' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1B2A' }] },
];
