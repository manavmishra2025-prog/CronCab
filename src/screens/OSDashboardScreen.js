// src/screens/OSDashboardScreen.js
// The OS Dashboard — visualizes all OS concepts running live in the app
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { driverScheduler } from '../services/DriverScheduler';
import { rideAllocator } from '../services/RideAllocator';
import { mapTileCache } from '../services/MapTileCache';
import { passengerLocationBuffer } from '../services/LocationBuffer';
import { sosService } from '../services/SOSInterruptHandler';
import { rideProcessManager } from '../services/RideStateManager';

const OS_CONCEPTS = [
  {
    id: 'scheduler',
    title: 'MLFQ Scheduler',
    concept: 'CPU Scheduling',
    icon: '🧮',
    color: Colors.accent,
    problem: 'Unfair driver distribution, long waits',
    solution: 'Multi-Level Feedback Queue with Aging',
  },
  {
    id: 'banker',
    title: "Banker's Algorithm",
    concept: 'Deadlock Prevention',
    icon: '🏦',
    color: Colors.primary,
    problem: 'Drivers confirmed but never show up',
    solution: 'Safe-state check before every allocation',
  },
  {
    id: 'fsm',
    title: 'FSM + Checkpointing',
    concept: 'Process States',
    icon: '💾',
    color: Colors.success,
    problem: 'App crash loses ride progress',
    solution: 'Atomic state transitions + AsyncStorage checkpoint',
  },
  {
    id: 'semaphore',
    title: 'Semaphore Lock',
    concept: 'Mutual Exclusion',
    icon: '🔒',
    color: Colors.warning,
    problem: 'Driver ghosting after accepting',
    solution: 'Binary semaphore held by driver until ride ends',
  },
  {
    id: 'lru',
    title: 'LRU Tile Cache',
    concept: 'Virtual Memory / Paging',
    icon: '🗺️',
    color: '#B57BFF',
    problem: 'Map lag, repeated tile fetches',
    solution: 'LRU page replacement with O(1) lookup',
  },
  {
    id: 'buffer',
    title: 'Circular GPS Buffer',
    concept: 'I/O Buffering + Tickless',
    icon: '📡',
    color: Colors.accent,
    problem: 'GPS jitter, battery drain',
    solution: 'Circular buffer + adaptive polling',
  },
  {
    id: 'irq',
    title: 'SOS Interrupt',
    concept: 'Hardware Interrupts (NMI)',
    icon: '⚡',
    color: Colors.danger,
    problem: 'Safety emergencies handled too slowly',
    solution: 'Non-maskable IRQ0 preempts all processes',
  },
  {
    id: 'aging',
    title: 'Aging / Priority Boost',
    concept: 'Starvation Prevention',
    icon: '⏫',
    color: Colors.success,
    problem: 'Idle drivers never get rides',
    solution: 'Idle time boosts driver priority periodically',
  },
];

function MetricCard({ label, value, unit = '', color = Colors.textPrimary }) {
  return (
    <View style={metricStyles.card}>
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      {unit ? <Text style={metricStyles.unit}>{unit}</Text> : null}
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  value: { fontSize: 20, fontFamily: Typography.heading },
  unit: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  label: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
});

export default function OSDashboardScreen() {
  const [schedulerStats, setSchedulerStats] = useState({ q0: 0, q1: 0, q2: 0, idleDrivers: 5, busyDrivers: 2 });
  const [cacheStats, setCacheStats] = useState({ hitRate: 72, size: 24, evictions: 8 });
  const [bufferStats, setBufferStats] = useState({ isStationary: false, currentPollRateMs: 1000 });
  const [zoneStats, setZoneStats] = useState([]);
  const [activeRides, setActiveRides] = useState(0);
  const [irqLog, setIrqLog] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedConcept, setExpandedConcept] = useState(null);

  const refresh = () => {
    const sStats = driverScheduler.getQueueStats();
    setSchedulerStats(sStats);
    const cs = mapTileCache.cacheStats;
    setCacheStats(cs);
    const bs = passengerLocationBuffer.stats;
    setBufferStats(bs);
    const zs = rideAllocator.getAllZoneStats();
    setZoneStats(zs);
    setActiveRides(rideProcessManager.getActive().length);
    setIrqLog(sosService.interruptLog.slice(-5).reverse());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>OS Dashboard</Text>
        <Text style={styles.subtitle}>Live system internals</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Live metrics */}
        <Text style={styles.sectionTitle}>Live Kernel Metrics</Text>
        <View style={styles.metricsRow}>
          <MetricCard label="Active Rides" value={activeRides} color={Colors.success} />
          <MetricCard label="Q0 (Emergency)" value={schedulerStats.q0} color={Colors.danger} />
          <MetricCard label="Q1 (Scheduled)" value={schedulerStats.q1} color={Colors.warning} />
          <MetricCard label="Q2 (Regular)" value={schedulerStats.q2} color={Colors.textSecondary} />
        </View>
        <View style={[styles.metricsRow, { marginTop: 8 }]}>
          <MetricCard label="Idle Drivers" value={schedulerStats.idleDrivers} color={Colors.driverOnline} />
          <MetricCard label="Busy Drivers" value={schedulerStats.busyDrivers} color={Colors.warning} />
          <MetricCard label="Cache Hit Rate" value={cacheStats.hitRate} unit="%" color={Colors.accent} />
          <MetricCard label="GPS Poll Rate" value={bufferStats.currentPollRateMs / 1000} unit="s" color={Colors.primary} />
        </View>

        {/* Zone allocation */}
        <Text style={styles.sectionTitle}>Zone Allocation — Banker's Algorithm</Text>
        {[
          { zone: 'downtown', util: 75, surge: 1.5, safe: true, drivers: 20, alloc: 15 },
          { zone: 'airport', util: 40, surge: 1.0, safe: true, drivers: 10, alloc: 4 },
          { zone: 'suburbs', util: 95, surge: 2.0, safe: false, drivers: 8, alloc: 8 },
        ].map((z) => (
          <View key={z.zone} style={styles.zoneCard}>
            <View style={styles.zoneHeader}>
              <Text style={styles.zoneName}>{z.zone.charAt(0).toUpperCase() + z.zone.slice(1)}</Text>
              <View style={[styles.safeChip, { borderColor: z.safe ? Colors.success : Colors.danger }]}>
                <Text style={[styles.safeChipText, { color: z.safe ? Colors.success : Colors.danger }]}>
                  {z.safe ? '✅ Safe State' : '⚠️ Unsafe State'}
                </Text>
              </View>
              <Text style={[styles.surgeMult, { color: z.surge > 1.5 ? Colors.danger : z.surge > 1 ? Colors.warning : Colors.success }]}>
                {z.surge}x
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${z.util}%`,
                backgroundColor: z.util > 90 ? Colors.danger : z.util > 70 ? Colors.warning : Colors.success,
              }]} />
            </View>
            <Text style={styles.zoneDetail}>{z.alloc}/{z.drivers} drivers allocated · {z.util}% utilization</Text>
          </View>
        ))}

        {/* LRU Cache viz */}
        <Text style={styles.sectionTitle}>LRU Map Tile Cache</Text>
        <View style={styles.cacheCard}>
          <View style={styles.cacheMetrics}>
            <View style={styles.cacheMetric}>
              <Text style={styles.cacheMetricVal}>{cacheStats.hitRate}%</Text>
              <Text style={styles.cacheMetricLabel}>Hit Rate</Text>
            </View>
            <View style={styles.cacheMetric}>
              <Text style={styles.cacheMetricVal}>{cacheStats.size}/50</Text>
              <Text style={styles.cacheMetricLabel}>Pages Used</Text>
            </View>
            <View style={styles.cacheMetric}>
              <Text style={styles.cacheMetricVal}>{cacheStats.evictions}</Text>
              <Text style={styles.cacheMetricLabel}>Evictions</Text>
            </View>
          </View>
          {/* Cache visual grid */}
          <View style={styles.cacheGrid}>
            {Array.from({ length: 25 }).map((_, i) => (
              <View
                key={i}
                style={[styles.cacheTile, {
                  backgroundColor: i < (cacheStats.size || 12)
                    ? i < 3 ? Colors.primary + '80' : Colors.accent + '40'
                    : Colors.surfaceElevated,
                }]}
              />
            ))}
          </View>
          <Text style={styles.cacheNote}>🟦 Hot (MRU) &nbsp; 🟩 Warm &nbsp; ⬜ Empty (available pages)</Text>
        </View>

        {/* GPS Buffer */}
        <Text style={styles.sectionTitle}>GPS Circular Buffer</Text>
        <View style={styles.bufferCard}>
          <View style={styles.bufferStatus}>
            <View style={[styles.bufferDot, { backgroundColor: bufferStats.isStationary ? Colors.textMuted : Colors.success }]} />
            <Text style={styles.bufferStatusText}>
              {bufferStats.isStationary ? 'Stationary — Tickless mode (10s poll)' : 'Moving — Active mode (1s poll)'}
            </Text>
          </View>
          <Text style={styles.bufferDetail}>
            Poll rate: {bufferStats.currentPollRateMs}ms · Battery saving: {bufferStats.isStationary ? '90%' : '0%'}
          </Text>
          <View style={styles.ringBuffer}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={[styles.ringCell, i < (bufferStats.bufferSize || 5) && styles.ringCellFilled]}>
                <Text style={styles.ringCellText}>{i < (bufferStats.bufferSize || 5) ? '●' : '○'}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.bufferNote}>Circular buffer: 8 slots · Median-filtered output</Text>
        </View>

        {/* IRQ Log */}
        <Text style={styles.sectionTitle}>IRQ Interrupt Log</Text>
        <View style={styles.irqCard}>
          {irqLog.length === 0 ? (
            <Text style={styles.irqEmpty}>No interrupts raised yet. Trigger SOS to see IRQ0.</Text>
          ) : (
            irqLog.map((entry, i) => (
              <View key={i} style={styles.irqRow}>
                <Text style={styles.irqLevel}>IRQ{entry.irqLevel}</Text>
                <Text style={styles.irqLabel}>{entry.label}</Text>
                <Text style={styles.irqLatency}>{entry.latencyMs ? `${entry.latencyMs}ms` : '...'}</Text>
              </View>
            ))
          )}
        </View>

        {/* OS Concepts Cards */}
        <Text style={styles.sectionTitle}>OS Concepts Reference</Text>
        {OS_CONCEPTS.map((concept) => (
          <TouchableOpacity
            key={concept.id}
            style={[styles.conceptCard, expandedConcept === concept.id && { borderColor: concept.color }]}
            onPress={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
            activeOpacity={0.8}
          >
            <View style={styles.conceptHeader}>
              <Text style={styles.conceptIcon}>{concept.icon}</Text>
              <View style={styles.conceptTitles}>
                <Text style={[styles.conceptTitle, { color: concept.color }]}>{concept.title}</Text>
                <Text style={styles.conceptOSTopic}>{concept.concept}</Text>
              </View>
              <Text style={styles.expandArrow}>{expandedConcept === concept.id ? '▲' : '▼'}</Text>
            </View>
            {expandedConcept === concept.id && (
              <View style={styles.conceptExpanded}>
                <Text style={styles.conceptProblemLabel}>Problem (Ola/Uber):</Text>
                <Text style={styles.conceptProblem}>{concept.problem}</Text>
                <Text style={styles.conceptSolutionLabel}>OS Solution:</Text>
                <Text style={styles.conceptSolution}>{concept.solution}</Text>
              </View>
            )}
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
  subtitle: { fontSize: 13, fontFamily: Typography.body, color: Colors.textMuted },
  scroll: { padding: Spacing.lg },
  sectionTitle: {
    fontSize: 11, fontFamily: Typography.bodyBold, color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  zoneCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  zoneName: { flex: 1, fontSize: 14, fontFamily: Typography.bodyBold, color: Colors.textPrimary },
  safeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  safeChipText: { fontSize: 9, fontFamily: Typography.bodyBold },
  surgeMult: { fontSize: 16, fontFamily: Typography.heading },
  progressBg: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, borderRadius: 3 },
  zoneDetail: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted },
  cacheCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  cacheMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  cacheMetric: { alignItems: 'center' },
  cacheMetricVal: { fontSize: 22, fontFamily: Typography.heading, color: Colors.accent },
  cacheMetricLabel: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  cacheGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  cacheTile: { width: 20, height: 20, borderRadius: 3, borderWidth: 1, borderColor: Colors.border },
  cacheNote: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted },
  bufferCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  bufferStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bufferDot: { width: 8, height: 8, borderRadius: 4 },
  bufferStatusText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: Colors.textPrimary },
  bufferDetail: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted, marginBottom: 12 },
  ringBuffer: { flexDirection: 'row', gap: 6, marginBottom: 6, justifyContent: 'center' },
  ringCell: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  ringCellFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  ringCellText: { fontSize: 10, color: Colors.textMuted },
  bufferNote: { fontSize: 9, fontFamily: Typography.body, color: Colors.textMuted, textAlign: 'center' },
  irqCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  irqEmpty: { fontSize: 11, fontFamily: Typography.body, color: Colors.textMuted },
  irqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  irqLevel: { fontSize: 10, fontFamily: Typography.mono || 'monospace', color: Colors.danger, width: 36 },
  irqLabel: { flex: 1, fontSize: 11, fontFamily: Typography.body, color: Colors.textSecondary },
  irqLatency: { fontSize: 9, fontFamily: Typography.mono || 'monospace', color: Colors.textMuted },
  conceptCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  conceptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  conceptIcon: { fontSize: 22 },
  conceptTitles: { flex: 1 },
  conceptTitle: { fontSize: 14, fontFamily: Typography.heading },
  conceptOSTopic: { fontSize: 10, fontFamily: Typography.body, color: Colors.textMuted },
  expandArrow: { fontSize: 10, color: Colors.textMuted },
  conceptExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: Colors.border },
  conceptProblemLabel: { fontSize: 9, fontFamily: Typography.bodyBold, color: Colors.danger, marginBottom: 3, textTransform: 'uppercase' },
  conceptProblem: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  conceptSolutionLabel: { fontSize: 9, fontFamily: Typography.bodyBold, color: Colors.success, marginBottom: 3, textTransform: 'uppercase' },
  conceptSolution: { fontSize: 12, fontFamily: Typography.body, color: Colors.textSecondary, lineHeight: 18 },
});
