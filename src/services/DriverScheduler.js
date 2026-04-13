// src/services/DriverScheduler.js
// OS Concept: CPU Scheduling — Multi-Level Feedback Queue (MLFQ) + Aging
//
// Problem Solved:
//   1. Unfair driver distribution — some zones always get drivers, others starved
//   2. Long wait times — no smart prioritization of urgent/pre-booked requests
//   3. Driver starvation — idle drivers in low-demand zones never get rides
//
// Solution: MLFQ with 3 priority levels + aging mechanism
//   Q0 (Highest) → SOS / Medical / Airport pre-books
//   Q1 (Medium)  → Scheduled rides, Prime/SUV requests
//   Q2 (Lowest)  → Regular on-demand, short hops
//
// Aging: If a ride request waits > AGING_THRESHOLD ms, it gets promoted up one queue.
// This prevents indefinite postponement (starvation).

const QUEUE_LEVELS = 3;
const TIME_QUANTUM_MS = [0, 30000, 60000]; // Q0 immediate, Q1 30s, Q2 60s
const AGING_THRESHOLD_MS = 3 * 60 * 1000;  // 3 minutes → promote to higher queue
const DRIVER_BOOST_INTERVAL_MS = 2 * 60 * 1000; // Idle drivers boosted every 2 min

class RideRequest {
  constructor({ id, userId, type, pickup, dropoff, rideClass = 'mini', isEmergency = false, isScheduled = false, scheduledTime = null }) {
    this.id = id;
    this.userId = userId;
    this.type = type;
    this.pickup = pickup;
    this.dropoff = dropoff;
    this.rideClass = rideClass;
    this.isEmergency = isEmergency;
    this.isScheduled = isScheduled;
    this.scheduledTime = scheduledTime;
    this.createdAt = Date.now();
    this.promotedAt = Date.now();
    this.priority = this._computeInitialPriority();
    this.waitTime = 0;
    this.assignedDriver = null;
  }

  _computeInitialPriority() {
    if (this.isEmergency) return 0;                      // Q0: SOS
    if (this.isScheduled || this.rideClass === 'prime' || this.rideClass === 'suv') return 1; // Q1
    return 2;                                             // Q2: regular
  }

  get age() {
    return Date.now() - this.createdAt;
  }
}

class DriverRecord {
  constructor({ id, name, location, vehicleClass, rating }) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.vehicleClass = vehicleClass;
    this.rating = rating;
    this.status = 'idle'; // idle | en_route | busy | offline
    this.idleSince = Date.now();
    this.priorityBoost = 0;  // Aging boost — how many levels promoted due to idleness
    this.ridesCompleted = 0;
    this.currentRideId = null;
  }

  get idleTime() {
    if (this.status !== 'idle') return 0;
    return Date.now() - this.idleSince;
  }

  effectivePriority() {
    // Lower number = higher priority
    return Math.max(0, 2 - this.priorityBoost);
  }
}

class MultiLevelFeedbackQueue {
  constructor() {
    // 3 queues: Q0 (highest), Q1, Q2 (lowest)
    this.queues = [[], [], []];
    this.drivers = new Map();       // driverId → DriverRecord
    this.activeRequests = new Map(); // requestId → RideRequest

    // Start aging and driver-boost timers (simulate OS scheduler ticks)
    this._agingInterval = setInterval(() => this._runAgingPass(), 30000);
    this._driverBoostInterval = setInterval(() => this._runDriverBoost(), DRIVER_BOOST_INTERVAL_MS);
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  registerDriver(driverData) {
    const record = new DriverRecord(driverData);
    this.drivers.set(driverData.id, record);
    return record;
  }

  updateDriverLocation(driverId, location) {
    const d = this.drivers.get(driverId);
    if (d) d.location = location;
  }

  setDriverStatus(driverId, status) {
    const d = this.drivers.get(driverId);
    if (!d) return;
    d.status = status;
    if (status === 'idle') d.idleSince = Date.now();
    if (status !== 'idle') d.priorityBoost = 0; // Reset boost when assigned
  }

  // ─── Enqueue Ride Request ──────────────────────────────────────────────────

  enqueueRequest(requestData) {
    const req = new RideRequest(requestData);
    this.queues[req.priority].push(req);
    this.activeRequests.set(req.id, req);
    console.log(`[Scheduler] Request ${req.id} enqueued at Q${req.priority}`);
    return req;
  }

  // ─── Schedule: Dispatch next request to best available driver ─────────────

  schedule() {
    for (let level = 0; level < QUEUE_LEVELS; level++) {
      if (this.queues[level].length === 0) continue;

      const request = this.queues[level][0]; // Peek (don't dequeue yet)
      const driver = this._findBestDriver(request);

      if (driver) {
        this.queues[level].shift(); // Dequeue
        this._assignRide(request, driver);
        return { request, driver };
      }

      // No driver at this level — if Q0 (emergency), wait; else fall through
      if (level === 0) break; // Emergency: hold, don't fallthrough
    }
    return null; // No assignment possible right now
  }

  // ─── Find Best Driver (Shortest Job First within driver priority) ──────────

  _findBestDriver(request) {
    const available = Array.from(this.drivers.values()).filter(
      (d) => d.status === 'idle' && d.vehicleClass === request.rideClass || d.vehicleClass === 'any'
    );

    if (available.length === 0) return null;

    // Sort by: (1) effective priority (aged drivers first), (2) proximity
    available.sort((a, b) => {
      const priorityDiff = a.effectivePriority() - b.effectivePriority();
      if (priorityDiff !== 0) return priorityDiff;
      return this._distance(a.location, request.pickup) - this._distance(b.location, request.pickup);
    });

    return available[0];
  }

  _assignRide(request, driver) {
    driver.status = 'en_route';
    driver.currentRideId = request.id;
    driver.priorityBoost = 0;
    request.assignedDriver = driver.id;
    this.activeRequests.set(request.id, request);
    console.log(`[Scheduler] Driver ${driver.id} assigned to ride ${request.id} from Q`);
  }

  // ─── Aging Pass ───────────────────────────────────────────────────────────
  // Prevents starvation: promote long-waiting requests up one queue level

  _runAgingPass() {
    for (let level = 1; level < QUEUE_LEVELS; level++) {
      const promoted = [];
      const remaining = [];

      for (const req of this.queues[level]) {
        if (Date.now() - req.promotedAt > AGING_THRESHOLD_MS) {
          req.priority = level - 1;
          req.promotedAt = Date.now();
          promoted.push(req);
          console.log(`[Scheduler][Aging] Request ${req.id} promoted from Q${level} → Q${level - 1}`);
        } else {
          remaining.push(req);
        }
      }

      this.queues[level] = remaining;
      this.queues[level - 1].push(...promoted);
    }
  }

  // ─── Driver Boost ─────────────────────────────────────────────────────────
  // Idle drivers get priority boost over time — they get assigned before busy-cycle drivers

  _runDriverBoost() {
    for (const driver of this.drivers.values()) {
      if (driver.status === 'idle' && driver.idleTime > DRIVER_BOOST_INTERVAL_MS) {
        driver.priorityBoost = Math.min(driver.priorityBoost + 1, 2);
        console.log(`[Scheduler][Aging] Driver ${driver.id} boosted to priority ${driver.effectivePriority()}`);
      }
    }
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  _distance(loc1, loc2) {
    if (!loc1 || !loc2) return Infinity;
    const R = 6371;
    const dLat = this._toRad(loc2.latitude - loc1.latitude);
    const dLon = this._toRad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this._toRad(loc1.latitude)) *
        Math.cos(this._toRad(loc2.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  getQueueStats() {
    return {
      q0: this.queues[0].length,
      q1: this.queues[1].length,
      q2: this.queues[2].length,
      totalDrivers: this.drivers.size,
      idleDrivers: Array.from(this.drivers.values()).filter((d) => d.status === 'idle').length,
      busyDrivers: Array.from(this.drivers.values()).filter((d) => d.status !== 'idle' && d.status !== 'offline').length,
    };
  }

  destroy() {
    clearInterval(this._agingInterval);
    clearInterval(this._driverBoostInterval);
  }
}

export const driverScheduler = new MultiLevelFeedbackQueue();
export { RideRequest, DriverRecord };
