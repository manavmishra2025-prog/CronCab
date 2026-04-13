// src/services/RideService.js
// Orchestrates all OS-concept services together for a complete ride flow

import { rideProcessManager, RideState } from './RideStateManager';
import { driverScheduler } from './DriverScheduler';
import { rideAllocator } from './RideAllocator';
import { rideLockRegistry } from './SemaphoreService';
import { sosService, IRQ } from './SOSInterruptHandler';
import { passengerLocationBuffer } from './LocationBuffer';

let rideCounter = 1000;

function generateRideId() {
  return `RIDE_${++rideCounter}_${Date.now().toString(36).toUpperCase()}`;
}

function generateDriverId() {
  return `DRV_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Simulated driver pool (in production, this comes from backend)
const MOCK_DRIVERS = [
  { id: generateDriverId(), name: 'Arjun K.', vehicleClass: 'mini', rating: 4.8, location: { latitude: 13.085, longitude: 80.273 } },
  { id: generateDriverId(), name: 'Priya S.', vehicleClass: 'prime', rating: 4.9, location: { latitude: 13.080, longitude: 80.270 } },
  { id: generateDriverId(), name: 'Kiran M.', vehicleClass: 'suv', rating: 4.7, location: { latitude: 13.090, longitude: 80.275 } },
  { id: generateDriverId(), name: 'Deepa R.', vehicleClass: 'moto', rating: 4.6, location: { latitude: 13.082, longitude: 80.268 } },
  { id: generateDriverId(), name: 'Vikram P.', vehicleClass: 'mini', rating: 4.5, location: { latitude: 13.078, longitude: 80.265 } },
];

class RideService {
  constructor() {
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;

    // Register mock drivers with scheduler
    MOCK_DRIVERS.forEach((d) => driverScheduler.registerDriver(d));

    // Initialize zones with the allocator
    rideAllocator.initZone('downtown', 20);
    rideAllocator.initZone('airport', 10);
    rideAllocator.initZone('suburbs', 8);
    rideAllocator.initZone('default', 15);

    // Recover any checkpointed rides from previous session
    const recovered = await rideProcessManager.restoreAll();
    if (recovered.length > 0) {
      console.log(`[RideService] Recovered ${recovered.length} rides from checkpoint`);
    }

    this._initialized = true;
    console.log('[RideService] Initialized');
  }

  // ─── Book a Ride ─────────────────────────────────────────────────────────

  async bookRide({ userId, pickup, dropoff, rideClass = 'mini' }) {
    await this.initialize();

    const rideId = generateRideId();
    const zoneId = this._detectZone(pickup);

    // Step 1: Acquire booking mutex (one booking at a time per user)
    await rideLockRegistry.acquireRequestSlot(userId);

    try {
      // Step 2: Create ride process (FSM)
      const rideProcess = rideProcessManager.create(rideId, {
        userId,
        pickup,
        dropoff,
        rideClass,
        zoneId,
      });

      // Step 3: Transition to SEARCHING
      await rideProcess.transition(RideState.SEARCHING);

      // Step 4: Banker's algorithm — check if allocation is safe
      const allocation = await rideAllocator.requestAllocation({ rideId, zoneId, userId });

      if (!allocation.success) {
        await rideProcess.transition(RideState.FAILED, { reason: allocation.reason });
        return { success: false, reason: allocation.reason, waitPosition: allocation.waitPosition };
      }

      // Step 5: Create ride lock (semaphore)
      rideLockRegistry.createRideLock(rideId);

      // Step 6: Schedule ride request (MLFQ)
      const request = driverScheduler.enqueueRequest({
        id: rideId,
        userId,
        type: 'ride',
        pickup,
        dropoff,
        rideClass,
      });

      // Step 7: Simulate driver match (in production, real-time from backend)
      const driverMatch = await this._simulateDriverMatch(rideId, rideClass, pickup);

      if (!driverMatch) {
        await rideProcess.transition(RideState.CANCELLED, { reason: 'NO_DRIVER_AVAILABLE' });
        rideAllocator.releaseAllocation(rideId, zoneId);
        return { success: false, reason: 'NO_DRIVER_AVAILABLE' };
      }

      // Step 8: Acquire ride lock (driver commits to ride)
      await rideLockRegistry.acquireRideLock(rideId, driverMatch.id);

      // Step 9: Transition to DRIVER_ASSIGNED
      await rideProcess.transition(RideState.DRIVER_ASSIGNED, {
        driver: driverMatch,
        surgeMultiplier: allocation.surgeMultiplier,
        estimatedPickupTime: driverMatch.etaMinutes,
      });

      const fare = this._calculateFare(pickup, dropoff, rideClass, allocation.surgeMultiplier);

      return {
        success: true,
        rideId,
        driver: driverMatch,
        fare,
        surgeMultiplier: allocation.surgeMultiplier,
        zoneUtilization: allocation.zoneUtilization,
        state: rideProcess.toJSON(),
      };

    } finally {
      // Always release booking mutex
      rideLockRegistry.releaseRequestSlot(userId);
    }
  }

  // ─── Progress Ride Through States ────────────────────────────────────────

  async advanceRideState(rideId, targetState, payload = {}) {
    const rideProcess = await rideProcessManager.getOrRestore(rideId);
    if (!rideProcess) throw new Error(`Ride ${rideId} not found`);

    await rideProcess.transition(targetState, payload);
    return rideProcess.toJSON();
  }

  async completeRide(rideId, driverId) {
    const rideProcess = await rideProcessManager.getOrRestore(rideId);
    if (!rideProcess) throw new Error(`Ride ${rideId} not found`);

    await rideProcess.transition(RideState.COMPLETING);
    await rideProcess.transition(RideState.COMPLETED, { completedAt: Date.now() });

    // Release semaphore — driver is now free
    try {
      rideLockRegistry.releaseRideLock(rideId, driverId);
      rideLockRegistry.destroyRideLock(rideId);
    } catch (e) {
      console.warn('[RideService] Lock release error:', e.message);
    }

    // Release zone allocation
    rideAllocator.releaseAllocation(rideId, rideProcess.data.zoneId);

    // Update driver status
    driverScheduler.setDriverStatus(driverId, 'idle');

    // Cleanup checkpoint
    rideProcessManager.terminate(rideId);

    return rideProcess.toJSON();
  }

  async cancelRide(rideId, cancelledBy, reason) {
    const rideProcess = await rideProcessManager.getOrRestore(rideId);
    if (!rideProcess) throw new Error(`Ride ${rideId} not found`);

    // Validate cancellation is allowed (semaphore check)
    const lockStatus = rideLockRegistry.getStatus(rideId);
    if (lockStatus?.isLocked && cancelledBy !== lockStatus.owner) {
      // Cannot cancel if driver has committed (lock acquired), unless emergency
      if (reason !== 'EMERGENCY' && reason !== 'SOS') {
        throw new Error('Ride is locked by driver — cancellation not permitted after pickup started');
      }
    }

    await rideProcess.transition(RideState.CANCELLED, { cancelledBy, reason });

    // Cleanup
    rideAllocator.releaseAllocation(rideId, rideProcess.data?.zoneId);
    try {
      rideLockRegistry.destroyRideLock(rideId);
    } catch (_) {}
    rideProcessManager.terminate(rideId);

    return rideProcess.toJSON();
  }

  // ─── SOS ─────────────────────────────────────────────────────────────────

  async triggerSOS({ userId, rideId, location, emergencyContacts }) {
    sosService.setEmergencyContacts(emergencyContacts);
    await sosService.triggerSOS({ userId, rideId, location });
    return { triggered: true, timestamp: Date.now() };
  }

  // ─── Estimate ────────────────────────────────────────────────────────────

  getEstimate(pickup, dropoff, rideClass) {
    const fare = this._calculateFare(pickup, dropoff, rideClass, 1.0);
    const zoneId = this._detectZone(pickup);
    const zoneStats = rideAllocator.getZoneStats(zoneId);
    const surge = zoneStats?.surgeMultiplier || 1.0;

    return {
      baseFare: fare.base,
      totalFare: Math.round(fare.base * surge),
      distance: fare.distanceKm,
      surgeMultiplier: surge,
      zoneUtilization: zoneStats?.utilizationRate || 0,
      etaMinutes: Math.ceil(2 + Math.random() * 6),
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  async _simulateDriverMatch(rideId, rideClass, pickup) {
    // Simulate network delay for driver matching
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const driver = MOCK_DRIVERS.find((d) => d.vehicleClass === rideClass || rideClass === 'mini');
    if (!driver) return null;

    return {
      ...driver,
      etaMinutes: Math.ceil(2 + Math.random() * 8),
      vehicleNumber: `TN ${Math.floor(10 + Math.random() * 89)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleModel: rideClass === 'moto' ? 'Honda Activa' : rideClass === 'prime' ? 'Toyota Etios' : rideClass === 'suv' ? 'Innova Crysta' : 'Maruti Swift',
    };
  }

  _detectZone(location) {
    if (!location) return 'default';
    // Simplified zone detection based on coordinates
    const { latitude, longitude } = location;
    if (latitude > 13.09) return 'airport';
    if (latitude < 13.07) return 'suburbs';
    if (Math.abs(longitude - 80.27) < 0.02) return 'downtown';
    return 'default';
  }

  _calculateFare(pickup, dropoff, rideClass, surgeMultiplier = 1) {
    const prices = { moto: 8, mini: 12, prime: 18, suv: 24 };
    const perKm = prices[rideClass] || 12;

    // Simulate distance
    const distanceKm = pickup && dropoff
      ? this._haversine(pickup, dropoff)
      : 5 + Math.random() * 10;

    const base = Math.round(40 + distanceKm * perKm); // Base fare + distance
    return {
      base,
      total: Math.round(base * surgeMultiplier),
      distanceKm: Math.round(distanceKm * 10) / 10,
      perKm,
    };
  }

  _haversine(a, b) {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  getSchedulerStats() {
    return driverScheduler.getQueueStats();
  }

  getAllZoneStats() {
    return rideAllocator.getAllZoneStats();
  }
}

export const rideService = new RideService();
