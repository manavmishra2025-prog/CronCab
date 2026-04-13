// src/screens/OnboardingScreen.js
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import useAppStore from '../store/useAppStore';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setUser = useAppStore((s) => s.setUser);
  const passengerScale = useRef(new Animated.Value(1)).current;
  const driverScale = useRef(new Animated.Value(1)).current;

  const handleRoleSelect = (role) => {
    setUserRole(role);
    setUser({ id: `USR_${Date.now()}`, name: role === 'passenger' ? 'Alex Kumar' : 'Arjun Driver', role });

    Animated.sequence([
      Animated.spring(role === 'passenger' ? passengerScale : driverScale, {
        toValue: 0.95, friction: 8, useNativeDriver: true,
      }),
      Animated.spring(role === 'passenger' ? passengerScale : driverScale, {
        toValue: 1, friction: 8, useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.replace(role === 'passenger' ? 'PassengerApp' : 'DriverApp');
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logo}>RidOS</Text>
        <Text style={styles.headline}>Who are you?</Text>
        <Text style={styles.subtitle}>
          Select your role to continue.{'\n'}OS-powered rides await.
        </Text>
      </View>

      <View style={styles.cards}>
        <Animated.View style={{ transform: [{ scale: passengerScale }] }}>
          <TouchableOpacity
            style={[styles.roleCard, styles.passengerCard]}
            onPress={() => handleRoleSelect('passenger')}
            activeOpacity={0.9}
          >
            <Text style={styles.roleEmoji}>🧑‍💼</Text>
            <Text style={styles.roleTitle}>Passenger</Text>
            <Text style={styles.roleDesc}>
              Book rides, track drivers in real-time, trigger SOS, and see live surge info.
            </Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Ride with us →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: driverScale }] }}>
          <TouchableOpacity
            style={[styles.roleCard, styles.driverCard]}
            onPress={() => handleRoleSelect('driver')}
            activeOpacity={0.9}
          >
            <Text style={styles.roleEmoji}>🚗</Text>
            <Text style={styles.roleTitle}>Driver</Text>
            <Text style={styles.roleDesc}>
              Accept ride requests, manage your status, track earnings and performance.
            </Text>
            <View style={[styles.pill, styles.pillDriver]}>
              <Text style={styles.pillText}>Earn with us →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.osTag}>
        <Text style={styles.osTagText}>⚙️ Powered by OS concepts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 14,
    fontFamily: Typography.heading,
    color: Colors.primary,
    letterSpacing: 3,
    marginBottom: Spacing.lg,
  },
  headline: {
    fontSize: 40,
    fontFamily: Typography.heading,
    color: Colors.textPrimary,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  cards: {
    gap: Spacing.md,
  },
  roleCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  passengerCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  driverCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accent,
  },
  roleEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  roleTitle: {
    fontSize: 24,
    fontFamily: Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleDesc: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  pillDriver: {
    backgroundColor: Colors.accent,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Typography.bodyBold,
    color: Colors.background,
  },
  osTag: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  osTagText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Colors.textMuted,
  },
});
