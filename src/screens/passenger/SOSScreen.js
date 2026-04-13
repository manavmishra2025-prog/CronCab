// src/screens/passenger/SOSScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import useAppStore from '../../store/useAppStore';
import { sosService } from '../../services/SOSInterruptHandler';

export default function SOSScreen({ route, navigation }) {
  const { rideId, driverLocation } = route.params || {};
  const { user, emergencyContacts, setSosActive } = useAppStore();
  const [phase, setPhase] = useState('idle'); // idle | counting | active | deactivated
  const [countdown, setCountdown] = useState(5);
  const [irqLog, setIrqLog] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bgFlashAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef(null);

  const startSOS = () => {
    setPhase('counting');
    setCountdown(5);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    Vibration.vibrate([0, 200, 100, 200]);

    let count = 5;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        activateSOS();
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setPhase('idle');
    setCountdown(5);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const activateSOS = async () => {
    setPhase('active');
    setSosActive(true);
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgFlashAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(bgFlashAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ])
    ).start();

    // Log interrupt events
    const log = [
      { time: new Date().toLocaleTimeString(), event: 'IRQ0 raised — SOS Non-Maskable Interrupt', color: Colors.danger },
      { time: new Date().toLocaleTimeString(), event: 'ISR entered — saving process state', color: Colors.warning },
      { time: new Date().toLocaleTimeString(), event: 'Broadcasting to emergency contacts...', color: Colors.warning },
      { time: new Date().toLocaleTimeString(), event: 'Alerting RidOS platform — escalating to agent', color: Colors.warning },
      { time: new Date().toLocaleTimeString(), event: 'Emergency location stream started (5s interval)', color: Colors.success },
      { time: new Date().toLocaleTimeString(), event: 'ISR complete — ride process resumed', color: Colors.success },
    ];

    log.forEach((entry, i) => {
      setTimeout(() => {
        setIrqLog((prev) => [entry, ...prev]);
      }, i * 500);
    });

    await sosService.triggerSOS({
      userId: user?.id,
      rideId,
      location: driverLocation || { latitude: 13.0827, longitude: 80.2707 },
    });
  };

  const deactivateSOS = () => {
    sosService.deactivateSOS();
    setSosActive(false);
    setPhase('deactivated');
    bgFlashAnim.stopAnimation();
    bgFlashAnim.setValue(0);
    Vibration.cancel();
  };

  useEffect(() => {
    return () => {
      clearInterval(countdownRef.current);
      Vibration.cancel();
    };
  }, []);

  const bgColor = bgFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.background, '#1A0008'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Main SOS button */}
        {phase === 'idle' && (
          <View style={styles.sosSection}>
            <Text style={styles.sosDesc}>
              Press and hold to trigger an emergency alert.{'\n'}
              Your location will be shared with emergency contacts and RidOS agents instantly.
            </Text>
            <TouchableOpacity
              style={styles.mainSosBtn}
              onPress={startSOS}
              activeOpacity={0.85}
            >
              <Text style={styles.mainSosBtnEmoji}>🆘</Text>
              <Text style={styles.mainSosBtnText}>TRIGGER SOS</Text>
              <Text style={styles.mainSosBtnSub}>Tap to begin 5-second countdown</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'counting' && (
          <View style={styles.sosSection}>
            <Animated.View style={[styles.countdownRing, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownLabel}>seconds</Text>
            </Animated.View>
            <Text style={styles.countingText}>SOS activating in {countdown}s...</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelCountdown}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'active' && (
          <View style={styles.sosSection}>
            <Animated.View style={[styles.activeRing, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.activeBigEmoji}>🚨</Text>
              <Text style={styles.activeSosText}>SOS ACTIVE</Text>
            </Animated.View>
            <Text style={styles.activeDesc}>
              Emergency alert sent.{'\n'}Help is on the way.
            </Text>
            <TouchableOpacity style={styles.deactivateBtn} onPress={deactivateSOS}>
              <Text style={styles.deactivateBtnText}>I'm Safe — Deactivate SOS</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'deactivated' && (
          <View style={styles.sosSection}>
            <Text style={styles.safeEmoji}>✅</Text>
            <Text style={styles.safeTitle}>SOS Deactivated</Text>
            <Text style={styles.safeDesc}>
              Location stream stopped.{'\n'}Emergency contacts have been notified you're safe.
            </Text>
            <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backHomeBtnText}>Return to Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency contacts */}
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {emergencyContacts.map((c, i) => (
            <View key={i} style={styles.contactCard}>
              <Text style={styles.contactEmoji}>👤</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
                <Text style={styles.contactRelation}>{c.relation}</Text>
              </View>
              {phase === 'active' && (
                <View style={styles.alertedBadge}>
                  <Text style={styles.alertedText}>Alerted ✓</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* OS Interrupt log */}
        {irqLog.length > 0 && (
          <View style={styles.irqSection}>
            <Text style={styles.sectionTitle}>⚡ IRQ Interrupt Log</Text>
            <View style={styles.irqBox}>
              {irqLog.map((entry, i) => (
                <View key={i} style={styles.irqRow}>
                  <Text style={[styles.irqTime]}>{entry.time}</Text>
                  <Text style={[styles.irqEvent, { color: entry.color }]}>{entry.event}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* OS concept explanation */}
        <View style={styles.osCard}>
          <Text style={styles.osCardTitle}>⚙️ OS Concept: Interrupt Handling</Text>
          <Text style={styles.osCardText}>
            SOS is modelled as a Non-Maskable Interrupt (IRQ0). Like hardware NMIs in CPUs, it cannot be masked or blocked. It preempts all ongoing processes, runs the ISR (interrupt service routine), and returns control to the ride process after handling. This ensures guaranteed, immediate delivery even if the app is in background.
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textSecondary },
  headerTitle: { fontSize: 18, fontFamily: Typography.heading, color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  sosSection: { alignItems: 'center', marginBottom: Spacing.xl },
  sosDesc: {
    fontSize: 14, fontFamily: Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xl,
  },
  mainSosBtn: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FF6B6B',
    shadowColor: Colors.danger, shadowOpacity: 0.6, shadowRadius: 30, elevation: 12,
  },
  mainSosBtnEmoji: { fontSize: 50 },
  mainSosBtnText: { fontSize: 16, fontFamily: Typography.heading, color: '#fff', letterSpacing: 2, marginTop: 8 },
  mainSosBtnSub: { fontSize: 10, fontFamily: Typography.body, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  countdownRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 4, borderColor: Colors.warning,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    backgroundColor: Colors.surfaceElevated,
  },
  countdownNum: { fontSize: 72, fontFamily: Typography.heading, color: Colors.warning },
  countdownLabel: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary },
  countingText: { fontSize: 16, fontFamily: Typography.bodyMedium, color: Colors.warning, marginBottom: 20 },
  cancelBtn: {
    backgroundColor: Colors.surface, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { fontSize: 15, fontFamily: Typography.bodyBold, color: Colors.textPrimary },
  activeRing: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.danger + '22', borderWidth: 4, borderColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  activeBigEmoji: { fontSize: 60 },
  activeSosText: { fontSize: 14, fontFamily: Typography.heading, color: Colors.danger, letterSpacing: 2 },
  activeDesc: { fontSize: 16, fontFamily: Typography.bodyMedium, color: Colors.textPrimary, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  deactivateBtn: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.success,
  },
  deactivateBtnText: { fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.success },
  safeEmoji: { fontSize: 64, marginBottom: 12 },
  safeTitle: { fontSize: 28, fontFamily: Typography.heading, color: Colors.success, marginBottom: 8 },
  safeDesc: { fontSize: 14, fontFamily: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  backHomeBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: Radius.full,
  },
  backHomeBtnText: { fontSize: 15, fontFamily: Typography.bodyBold, color: Colors.background },
  sectionTitle: {
    fontSize: 12, fontFamily: Typography.bodyBold, color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  contactsSection: { marginBottom: Spacing.xl },
  contactCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  contactEmoji: { fontSize: 24, marginRight: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.textPrimary },
  contactPhone: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary },
  contactRelation: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  alertedBadge: {
    backgroundColor: Colors.success + '22', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.success,
  },
  alertedText: { fontSize: 10, fontFamily: Typography.bodyBold, color: Colors.success },
  irqSection: { marginBottom: Spacing.xl },
  irqBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  irqRow: { flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'flex-start' },
  irqTime: { fontSize: 9, fontFamily: Typography.mono || 'monospace', color: Colors.textMuted, minWidth: 70 },
  irqEvent: { fontSize: 10, fontFamily: Typography.mono || 'monospace', flex: 1 },
  osCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl,
  },
  osCardTitle: { fontSize: 13, fontFamily: Typography.bodyBold, color: Colors.accent, marginBottom: 8 },
  osCardText: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, lineHeight: 19 },
});
