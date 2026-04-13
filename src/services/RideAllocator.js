// src/services/RideAllocator.js
// OS Concept: Deadlock Prevention — Banker's Algorithm
//
// Problem Solved:
//   - Multiple passengers booking simultaneously can exhaust drivers in a zone
//   - No backtracking → some users get confirmed, then no driver ever shows up (deadlock-like)
//   - Surge pricing feels "unfair" — no transparency on why pricing spikes
//
// Solution: Banker's Algorithm
//   Before confirming ANY ride, simulate the allocation.
//   If the resulting state is UNSAFE (could lead to no drivers for pending rides),
//   the request is DEFERRED, not rejected — queued and retried when resources free up.
//
// Zones = "processes", Available Drivers = "resources"
// Each zone has a MAX demand (historical peak) and CURRENT allocation.
// Allocation is only granted if the system remains in a SAFE STATE.

const ZONE_CONFIGS = {
  downtown: { maxDemand: 50, safetyBuffer: 5 },
  airport: { maxDemand: 30, safetyBuffer: 3 },
  suburbs: { maxDemand: 20, safetyBuffer: 2 },
  highway: { maxDemand: 10, safetyBuffer: 1 },
  default: { maxDemand: 15, safetyBuffer: 2 },
};

class ZoneState {
  constructor(zoneId, totalDrivers) {
    const config = ZONE_CONFIGS[zoneId] || ZONE_CONFIGS.default;
    this.zoneId = zoneId;
    this.totalDrivers = totalDrivers;
    this.allocated = 0;   // Currently assigned drivers
    this.maxDemand = Math.min(config.maxDemand, totalDrivers);
    this.safetyBuffer = config.safetyBuffer;
  }

  get available() {
    return this.totalDrivers - this.allocated;
  }

  get need() {
    return this.maxDemand - this.allocated;
  }

  get utilizationRate() {
    return this.allocated / this.totalDrivers;
  }

  get surgeMultiplier() {
    // Transparent surge: based on utilization, not hidden black box
    const util = this.utilizationRate;
    if (util < 0.5) return 1.0;
    if (util < 0.7) return 1.2;
    if (util < 0.85) return 1.5;
    if (util < 0.95) return 1.8;
    return 2.0;
  }
}

class BankersAllocator {
  constructor() {
    this._zones = new Map();  // zoneId → ZoneState
    this._pendingRequests = []; // Deferred requests (backlog)
    this._allocationLog = [];
  }

  // ─── Zone Management ────────────────────────────────────────────────────

  initZone(zoneId, totalDrivers) {
    this._zones.set(zoneId, new ZoneState(zoneId, totalDrivers));
  }

  updateZoneDriverCount(zoneId, count) {
    const zone = this._zones.get(zoneId);
    if (zone) zone.totalDrivers = count;
  }

  // ─── Core: Request Allocation ────────────────────────────────────────────

  async requestAllocation(rideRequest) {
    const { rideId, zoneId, userId } = rideRequest;

    if (!this._zones.has(zoneId)) {
      this.initZone(zoneId, 10); // Default: 10 drivers
    }

    const zone = this._zones.get(zoneId);
    console.log(`[Banker] Allocation request: ride=${rideId}, zone=${zoneId}, available=${zone.available}`);

    // Step 1: Check if zone can satisfy this request at all
    if (zone.available < 1 + zone.safetyBuffer) {
      console.log(`[Banker] Insufficient resources in ${zoneId}. Deferring ride ${rideId}`);
      this._pendingRequests.push(rideRequest);
      return { success: false, reason: 'INSUFFICIENT_RESOURCES', waitPosition: this._pendingRequests.length };
    }

    // Step 2: Simulate allocation → check if system remains in SAFE STATE
    const isSafe = this._isSafeState(zoneId, 1);
    if (!isSafe) {
      console.log(`[Banker] Unsafe state detected. Deferring ride ${rideId}`);
      this._pendingRequests.push(rideRequest);
      return { success: false, reason: 'UNSAFE_STATE', waitPosition: this._pendingRequests.length };
    }

    // Step 3: Allocate
    zone.allocated++;
    const surgeMultiplier = zone.surgeMultiplier;

    const logEntry = {
      rideId,
      zoneId,
      userId,
      allocatedAt: Date.now(),
      surgeMultiplier,
      zoneUtilization: zone.utilizationRate,
    };
    this._allocationLog.push(logEntry);

    console.log(`[Banker] Allocated ride ${rideId} in ${zoneId}. Surge: ${surgeMultiplier}x`);
    return {
      success: true,
      surgeMultiplier,
      zoneUtilization: zone.utilizationRate,
      availableInZone: zone.available,
    };
  }

  // ─── Release Allocation ──────────────────────────────────────────────────

  releaseAllocation(rideId, zoneId) {
    const zone = this._zones.get(zoneId);
    if (!zone) return;

    if (zone.allocated > 0) zone.allocated--;
    console.log(`[Banker] Released allocation for ride ${rideId} in ${zoneId}. Available: ${zone.available}`);

    // Try to fulfill pending requests
    this._processPendingRequests();
  }

  // ─── Safety Check — Banker's Safe State Algorithm ─────────────────────
  // Simulate allocating 1 more driver to this zone.
  // Then check: can ALL zones eventually complete their max-demand requests
  // given the REMAINING drivers? If yes → safe state.

  _isSafeState(requestingZone, requestAmount) {
    // Simulate: temporarily allocate
    const simZones = new Map();
    for (const [id, zone] of this._zones) {
      simZones.set(id, {
        totalDrivers: zone.totalDrivers,
        allocated: id === requestingZone ? zone.allocated + requestAmount : zone.allocated,
        maxDemand: zone.maxDemand,
        need: zone.maxDemand - (id === requestingZone ? zone.allocated + requestAmount : zone.allocated),
      });
    }

    // Available after simulation
    let totalAvailable = 0;
    for (const z of simZones.values()) {
      totalAvailable += z.totalDrivers - z.allocated;
    }

    // Safety algorithm: find a safe execution sequence
    const finished = new Set();
    let progress = true;

    while (progress) {
      progress = false;
      for (const [id, zone] of simZones) {
        if (finished.has(id)) continue;
        if (zone.need <= totalAvailable) {
          // This zone can complete — it releases its drivers
          totalAvailable += zone.allocated;
          finished.add(id);
          progress = true;
        }
      }
    }

    return finished.size === simZones.size; // Safe if all zones can finish
  }

  // ─── Process Deferred Requests ───────────────────────────────────────────

  async _processPendingRequests() {
    const stillPending = [];
    for (const req of this._pendingRequests) {
      const result = await this.requestAllocation(req);
      if (!result.success) stillPending.push(req);
    }
    this._pendingRequests = stillPending;
  }

  // ─── Zone Stats (for transparent surge display) ──────────────────────────

  getZoneStats(zoneId) {
    const zone = this._zones.get(zoneId);
    if (!zone) return null;
    return {
      zoneId,
      totalDrivers: zone.totalDrivers,
      allocated: zone.allocated,
      available: zone.available,
      utilizationRate: Math.round(zone.utilizationRate * 100),
      surgeMultiplier: zone.surgeMultiplier,
      isSafe: this._isSafeState(zoneId, 0),
      pendingRequests: this._pendingRequests.filter((r) => r.zoneId === zoneId).length,
    };
  }

  getAllZoneStats() {
    return Array.from(this._zones.keys()).map((id) => this.getZoneStats(id));
  }
}

export const rideAllocator = new BankersAllocator();
