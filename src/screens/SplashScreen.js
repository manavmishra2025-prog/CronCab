// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography } from '../constants/theme';
import { rideService } from '../services/RideService';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      await rideService.initialize();

      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]),
        Animated.timing(textAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
        Animated.timing(taglineAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 2800);
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background grid pattern */}
      <View style={styles.grid} />

      {/* Glow orb */}
      <View style={styles.glowOrb} />

      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoEmoji}>🚖</Text>
        </View>
        <Animated.Text style={[styles.logoText, { opacity: textAnim }]}>
          RidOS
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
          Operating Systems. On the road.
        </Animated.Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.bootText}>{'> Initializing ride kernel...'}</Text>
        <Text style={styles.bootText}>{'> Loading scheduler...'}</Text>
        <Text style={styles.bootText}>{'> Mounting driver registry...'}</Text>
        <Text style={[styles.bootText, styles.bootReady]}>{'> System ready ✓'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    position: 'absolute',
    width,
    height,
    opacity: 0.04,
    // Grid created via border pattern
    borderWidth: 0,
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.06,
    top: height / 2 - 200,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 52,
    fontFamily: Typography.heading,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textSecondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 32,
  },
  bootText: {
    fontSize: 10,
    fontFamily: Typography.mono || 'monospace',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  bootReady: {
    color: Colors.success,
  },
});
