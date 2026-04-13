// src/services/LocationBuffer.js
// OS Concept: Circular Buffer (Ring Buffer) + I/O Buffering
//             + Tickless Kernel (adaptive polling)
//
// Problem Solved:
//   1. Driver location "jitter" — GPS noise causes marker to jump around the map
//   2. Battery drain — constant high-frequency location polling even when stationary
//   3. Excessive re-renders from every raw GPS update
//
// Solution:
//   1. Circular Buffer: Store last N GPS readings; output median-filtered position
//      (OS analogy: I/O buffers that smooth bursty device input before sending to process)
//   2. Adaptive Polling (Tickless Kernel): 
//      High frequency when moving, low frequency when stationary
//      (like Linux NO_HZ mode — stop timer ticks when idle)

const BUFFER_SIZE = 8; // Keep last 8 GPS readings
const STATIONARY_THRESHOLD_METERS = 5; // < 5m movement → consider stationary
const MOVING_POLL_INTERVAL_MS = 1000;      // 1s when moving
const STATIONARY_POLL_INTERVAL_MS = 10000; // 10s when stationary (battery save)
const ACCURACY_THRESHOLD_METERS = 30;     // Reject readings with accuracy > 30m

class CircularBuffer {
  constructor(size) {
    this.size = size;
    this._buffer = new Array(size).fill(null);
    this._head = 0;   // Next write position
    this._count = 0;  // Number of valid entries
  }

  push(item) {
    this._buffer[this._head] = item;
    this._head = (this._head + 1) % this.size;
    if (this._count < this.size) this._count++;
  }

  getAll() {
    if (this._count === 0) return [];
    const result = [];
    const start = this._count < this.size ? 0 : this._head;
    for (let i = 0; i < this._count; i++) {
      result.push(this._buffer[(start + i) % this.size]);
    }
    return result;
  }

  get latest() {
    if (this._count === 0) return null;
    const idx = (this._head - 1 + this.size) % this.size;
    return this._buffer[idx];
  }

  get isFull() {
    return this._count === this.size;
  }

  clear() {
    this._buffer = new Array(this.size).fill(null);
    this._head = 0;
    this._count = 0;
  }
}

class LocationBuffer {
  constructor(bufferSize = BUFFER_SIZE) {
    this._buf = new CircularBuffer(bufferSize);
    this._subscribers = new Set();
    this._pollInterval = null;
    this._currentPollRate = MOVING_POLL_INTERVAL_MS;
    this._isStationary = false;
    this._consecutiveStationaryReadings = 0;
    this._stats = {
      totalReadings: 0,
      rejectedReadings: 0,
      filteringEvents: 0,
      stationaryTransitions: 0,
    };
  }

  // ─── Feed Raw GPS Reading ────────────────────────────────────────────────

  feed(rawLocation) {
    this._stats.totalReadings++;

    // Reject low-accuracy readings (GPS noise filter — like I/O error handling)
    if (rawLocation.accuracy && rawLocation.accuracy > ACCURACY_THRESHOLD_METERS) {
      this._stats.rejectedReadings++;
      console.log(`[LocationBuffer] Rejected low-accuracy reading: ${rawLocation.accuracy}m`);
      return null;
    }

    this._buf.push({
      latitude: rawLocation.latitude,
      longitude: rawLocation.longitude,
      accuracy: rawLocation.accuracy || 0,
      timestamp: Date.now(),
      speed: rawLocation.speed || 0,
      heading: rawLocation.heading || 0,
    });

    const smoothed = this._computeSmoothed();
    this._adaptPollRate(smoothed);
    this._notifySubscribers(smoothed);
    return smoothed;
  }

  // ─── Median Filter (smoothing) ───────────────────────────────────────────
  // OS analogy: signal processing in device drivers (e.g., touchscreen smoothing)

  _computeSmoothed() {
    const readings = this._buf.getAll().filter(Boolean);
    if (readings.length === 0) return null;
    if (readings.length === 1) return readings[0];

    // Median of latitudes and longitudes separately
    const lats = readings.map((r) => r.latitude).sort((a, b) => a - b);
    const lons = readings.map((r) => r.longitude).sort((a, b) => a - b);
    const mid = Math.floor(readings.length / 2);

    const medLat = readings.length % 2 === 0 ? (lats[mid - 1] + lats[mid]) / 2 : lats[mid];
    const medLon = readings.length % 2 === 0 ? (lons[mid - 1] + lons[mid]) / 2 : lons[mid];

    // Average speed & heading
    const avgSpeed = readings.reduce((s, r) => s + r.speed, 0) / readings.length;
    const latest = this._buf.latest;

    return {
      latitude: medLat,
      longitude: medLon,
      accuracy: Math.min(...readings.map((r) => r.accuracy)),
      speed: avgSpeed,
      heading: latest?.heading || 0,
      timestamp: Date.now(),
      isSmoothed: true,
      readingCount: readings.length,
    };
  }

  // ─── Adaptive Polling (Tickless) ─────────────────────────────────────────
  // Slow down polling when stationary — like CPU going tickless when idle

  _adaptPollRate(smoothed) {
    if (!smoothed) return;

    const prev = this._buf.getAll().filter(Boolean).slice(-2)[0];
    if (!prev) return;

    const dist = this._haversine(prev, smoothed);

    if (dist < STATIONARY_THRESHOLD_METERS) {
      this._consecutiveStationaryReadings++;
      if (this._consecutiveStationaryReadings >= 3 && !this._isStationary) {
        this._isStationary = true;
        this._stats.stationaryTransitions++;
        this._setPollRate(STATIONARY_POLL_INTERVAL_MS);
        console.log(`[LocationBuffer] Stationary detected → reducing poll to ${STATIONARY_POLL_INTERVAL_MS}ms`);
      }
    } else {
      this._consecutiveStationaryReadings = 0;
      if (this._isStationary) {
        this._isStationary = false;
        this._stats.stationaryTransitions++;
        this._setPollRate(MOVING_POLL_INTERVAL_MS);
        console.log(`[LocationBuffer] Movement detected → increasing poll to ${MOVING_POLL_INTERVAL_MS}ms`);
      }
    }
  }

  _setPollRate(ms) {
    if (this._currentPollRate === ms) return;
    this._currentPollRate = ms;
    // Signal to the location watcher to adjust its interval
    this._onPollRateChange && this._onPollRateChange(ms);
  }

  // ─── Subscription API ────────────────────────────────────────────────────

  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  onPollRateChange(callback) {
    this._onPollRateChange = callback;
  }

  _notifySubscribers(location) {
    this._subscribers.forEach((cb) => cb(location));
  }

  // ─── Haversine Distance ──────────────────────────────────────────────────

  _haversine(a, b) {
    const R = 6371000; // meters
    const φ1 = (a.latitude * Math.PI) / 180;
    const φ2 = (b.latitude * Math.PI) / 180;
    const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
    const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
    const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  get stats() {
    return {
      ...this._stats,
      bufferSize: this._buf._count,
      isStationary: this._isStationary,
      currentPollRateMs: this._currentPollRate,
      rejectionRate: this._stats.totalReadings > 0
        ? Math.round((this._stats.rejectedReadings / this._stats.totalReadings) * 100)
        : 0,
    };
  }

  reset() {
    this._buf.clear();
    this._isStationary = false;
    this._consecutiveStationaryReadings = 0;
  }
}

export const passengerLocationBuffer = new LocationBuffer();
export const driverLocationBuffer = new LocationBuffer();
export { CircularBuffer, LocationBuffer };
