// src/screens/passenger/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Animated, Dimensions, Platform,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius, RideTypes } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { rideService } from '../../services/RideService';

const { width, height } = Dimensions.get('window');

const CHENNAI = { latitude: 13.0827, longitude: 80.2707, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function HomeScreen({ navigation }) {
  const { user, currentLocation, mapRegion, setMapRegion, showToast } = useAppStore();
  const [dropoffText, setDropoffText] = useState('');
  const [zoneStats, setZoneStats] = useState([]);
  const [selectedType, setSelectedType] = useState('mini');
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    // Load zone stats for demand visualization
    const stats = rideService.getAllZoneStats();
    setZoneStats(stats || []);

    Animated.spring(sheetAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, []);

  const handleBook = () => {
    if (!dropoffText.trim()) {
      showToast('Please enter a destination', 'warning');
      return;
    }
    navigation.navigate('Booking', {
      pickup: currentLocation || CHENNAI,
      dropoffText,
      selectedType,
    });
  };

  const surgeColor = (multiplier) => {
    if (multiplier <= 1.0) return Colors.success;
    if (multiplier <= 1.5) return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={CHENNAI}
        customMapStyle={darkMapStyle}
        onRegionChangeComplete={setMapRegion}
      >
        {/* User marker */}
        <Marker coordinate={currentLocation || CHENNAI} title="You">
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        {/* Demand zone overlays */}
        <Circle
          center={{ latitude: 13.0827, longitude: 80.2707 }}
          radius={1200}
          fillColor="rgba(245,166,35,0.08)"
          strokeColor="rgba(245,166,35,0.3)"
          strokeWidth={1}
        />
        <Circle
          center={{ latitude: 13.095, longitude: 80.26 }}
          radius={800}
          fillColor="rgba(255,59,92,0.08)"
          strokeColor="rgba(255,59,92,0.3)"
          strokeWidth={1}
        />
        <Circle
          center={{ latitude: 13.07, longitude: 80.285 }}
          radius={1000}
          fillColor="rgba(0,200,150,0.08)"
          strokeColor="rgba(0,200,150,0.3)"
          strokeWidth={1}
        />
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Where to?</Text>
        </View>
        <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('SOS')}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, {
        transform: [{
          translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] })
        }]
      }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Search input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputDot} />
          <TextInput
            style={styles.input}
            placeholder="Enter destination..."
            placeholderTextColor={Colors.textMuted}
            value={dropoffText}
            onChangeText={setDropoffText}
          />
        </View>

        {/* Quick destinations */}
        <View style={styles.quickDestRow}>
          {['Work', 'Home', 'Airport', 'Mall'].map((dest) => (
            <TouchableOpacity
              key={dest}
              style={styles.quickDest}
              onPress={() => setDropoffText(dest)}
            >
              <Text style={styles.quickDestText}>{dest}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ride type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rideTypes}>
          {RideTypes.map((rt) => (
            <TouchableOpacity
              key={rt.id}
              style={[styles.rideTypeCard, selectedType === rt.id && styles.rideTypeSelected]}
              onPress={() => setSelectedType(rt.id)}
            >
              <Text style={styles.rideTypeEmoji}>{rt.emoji}</Text>
              <Text style={[styles.rideTypeLabel, selectedType === rt.id && styles.rideTypeLabelActive]}>
                {rt.label}
              </Text>
              <Text style={styles.rideTypeEta}>{rt.eta}</Text>
              <Text style={[styles.rideTypePrice, selectedType === rt.id && { color: Colors.primary }]}>
                ₹{rt.pricePerKm}/km
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Zone stats strip */}
        <View style={styles.zoneStrip}>
          <Text style={styles.zoneSurgeLabel}>Live Demand  •  Banker's Safe State</Text>
          <View style={styles.zoneStripRow}>
            {[
              { name: 'Downtown', surge: 1.5, util: 75, safe: true },
              { name: 'Airport', surge: 1.0, util: 40, safe: true },
              { name: 'Suburbs', surge: 2.0, util: 95, safe: false },
            ].map((z) => (
              <View key={z.name} style={styles.zoneChip}>
                <Text style={styles.zoneChipName}>{z.name}</Text>
                <Text style={[styles.zoneChipSurge, { color: surgeColor(z.surge) }]}>
                  {z.surge}x
                </Text>
                <Text style={styles.zoneChipUtil}>{z.util}%</Text>
                <Text style={styles.zoneSafe}>{z.safe ? '✅' : '⚠️'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Book button */}
        <TouchableOpacity style={styles.bookButton} onPress={handleBook} activeOpacity={0.85}>
          <Text style={styles.bookButtonText}>Book {RideTypes.find((r) => r.id === selectedType)?.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  userMarker: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.accent,
  },
  userMarkerInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
  },
  header: {
    position: 'absolute', top: 56, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 13, fontFamily: Typography.body, color: Colors.textSecondary,
    backgroundColor: 'rgba(10,10,15,0.8)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  subGreeting: {
    fontSize: 24, fontFamily: Typography.heading, color: Colors.textPrimary,
    marginTop: 4,
    textShadowColor: Colors.background, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  sosButton: {
    backgroundColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full,
    shadowColor: Colors.danger, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6,
  },
  sosText: { fontSize: 13, fontFamily: Typography.bodyBold, color: '#fff', letterSpacing: 1 },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 36,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  inputDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, marginRight: 10,
  },
  input: {
    flex: 1, fontSize: 15, fontFamily: Typography.body, color: Colors.textPrimary,
  },
  quickDestRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  quickDest: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  quickDestText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: Colors.textSecondary },
  rideTypes: { marginBottom: 16 },
  rideTypeCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 12, marginRight: 10,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, width: 90,
  },
  rideTypeSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  rideTypeEmoji: { fontSize: 24, marginBottom: 4 },
  rideTypeLabel: { fontSize: 12, fontFamily: Typography.bodyBold, color: Colors.textSecondary },
  rideTypeLabelActive: { color: Colors.primary },
  rideTypeEta: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, marginTop: 2 },
  rideTypePrice: { fontSize: 10, fontFamily: Typography.bodyMedium, color: Colors.textMuted, marginTop: 2 },
  zoneStrip: { marginBottom: 16 },
  zoneSurgeLabel: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, marginBottom: 8 },
  zoneStripRow: { flexDirection: 'row', gap: 8 },
  zoneChip: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  zoneChipName: { fontSize: 9, fontFamily: Typography.bodyMedium, color: Colors.textMuted, marginBottom: 2 },
  zoneChipSurge: { fontSize: 15, fontFamily: Typography.heading },
  zoneChipUtil: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  zoneSafe: { fontSize: 10, marginTop: 2 },
  bookButton: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  bookButtonText: { fontSize: 16, fontFamily: Typography.bodyBold, color: Colors.background },
});

// Dark map style for MapView
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A6A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C27' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2A2A3A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1B2A' }] },
];
