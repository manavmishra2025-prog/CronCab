// src/screens/driver/RideAcceptScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { RideState } from '../../services/RideStateManager';

const CHENNAI = { latitude: 13.0827, longitude: 80.2707 };

export default function RideAcceptScreen({ route, navigation }) {
  const { rideData } = route.params || {};
  const { updateDriverEarnings, showToast } = useAppStore();
  const [ridePhase, setRidePhase] = useState('en_route'); // en_route | arrived | in_ride | done

  const phaseLabels = {
    en_route: { title: 'En Route to Pickup', btn: "I've Arrived", next: 'arrived', state: RideState.EN_ROUTE_TO_PICKUP },
    arrived: { title: 'Arrived at Pickup', btn: 'Start Ride', next: 'in_ride', state: RideState.ARRIVED_AT_PICKUP },
    in_ride: { title: 'Ride in Progress', btn: 'Complete Ride', next: 'done', state: RideState.IN_RIDE },
    done: { title: 'Ride Completed! 🎉', btn: 'Back to Home', next: null, state: RideState.COMPLETED },
  };

  const current = phaseLabels[ridePhase];

  const handleAdvance = () => {
    if (current.next === null) {
      updateDriverEarnings(rideData?.fare || 145);
      showToast(`Earned ₹${rideData?.fare || 145} — Semaphore released`, 'success');
      navigation.replace('DriverApp');
      return;
    }
    setRidePhase(current.next);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MapView
        style={styles.map}
        initialRegion={{ ...CHENNAI, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        customMapStyle={darkMapStyle}
      >
        <Marker coordinate={CHENNAI} title="Pickup">
          <View style={styles.pickupMarker}><Text>📍</Text></View>
        </Marker>
        <Marker
          coordinate={{ latitude: CHENNAI.latitude + 0.04, longitude: CHENNAI.longitude + 0.03 }}
          title="Dropoff"
        >
          <View style={styles.dropoffMarker}><Text>🏁</Text></View>
        </Marker>
        <Polyline
          coordinates={[CHENNAI, { latitude: CHENNAI.latitude + 0.04, longitude: CHENNAI.longitude + 0.03 }]}
          strokeColor={Colors.primary}
          strokeWidth={3}
        />
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>{current.title}</Text>
          <Text style={styles.phaseState}>{current.state}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Passenger</Text>
            <Text style={styles.infoValue}>{rideData?.passenger || 'Alex K.'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Fare</Text>
            <Text style={[styles.infoValue, { color: Colors.primary }]}>₹{rideData?.fare || 145}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{rideData?.distance || 6.4} km</Text>
          </View>
        </View>

        {/* OS state log */}
        <View style={styles.osLog}>
          <Text style={styles.osLogTitle}>💾 FSM State Log</Text>
          {['DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP', ridePhase === 'arrived' || ridePhase === 'in_ride' || ridePhase === 'done' ? 'ARRIVED_AT_PICKUP' : null, ridePhase === 'in_ride' || ridePhase === 'done' ? 'IN_RIDE' : null, ridePhase === 'done' ? 'COMPLETED' : null].filter(Boolean).map((s, i) => (
            <Text key={i} style={styles.osLogEntry}>{'✓ ' + s + ' → checkpointed'}</Text>
          ))}
          <Text style={styles.osLogNote}>🔒 Semaphore held by this driver until ride completes</Text>
        </View>

        <TouchableOpacity style={styles.advanceBtn} onPress={handleAdvance} activeOpacity={0.85}>
          <Text style={styles.advanceBtnText}>{current.btn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  pickupMarker: { backgroundColor: Colors.surface, borderRadius: 16, padding: 4, borderWidth: 2, borderColor: Colors.success },
  dropoffMarker: { backgroundColor: Colors.surface, borderRadius: 16, padding: 4, borderWidth: 2, borderColor: Colors.danger },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border,
  },
  phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  phaseTitle: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  phaseState: { fontSize: 10, fontFamily: Typography.mono || 'monospace', color: Colors.accent },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  infoBox: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  infoLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 14, fontFamily: Typography.heading, color: Colors.textPrimary },
  osLog: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  osLogTitle: { fontSize: 10, fontFamily: Typography.bodyBold, color: Colors.textMuted, marginBottom: 6 },
  osLogEntry: { fontSize: 10, fontFamily: Typography.mono || 'monospace', color: Colors.success, marginBottom: 2 },
  osLogNote: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 4 },
  advanceBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  advanceBtnText: { fontSize: 16, fontFamily: Typography.bodyBold, color: Colors.background },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A6A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C27' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1B2A' }] },
];
