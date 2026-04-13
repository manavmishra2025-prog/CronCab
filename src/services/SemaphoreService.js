// src/services/SemaphoreService.js
// OS Concept: Semaphores & Mutex Locks
//
// Problem Solved: Drivers cancel after accepting (ghosting), duplicate ride requests
// Solution: Binary semaphore locks the ride once accepted. Neither party can
// arbitrarily cancel without going through the release protocol.
// Also provides Mutex for single-access critical sections (e.g., one booking at a time).

class Semaphore {
  constructor(initialCount = 1) {
    this._count = initialCount;
    this._waitQueue = []; // Processes waiting to acquire
  }

  /**
   * P() / wait() — Acquire the semaphore
   * If count > 0, decrement and proceed.
   * If count == 0, block (enqueue resolver).
   */
  async acquire() {
    if (this._count > 0) {
      this._count--;
      return Promise.resolve();
    }
    // Block: enqueue a promise resolver
    return new Promise((resolve) => {
      this._waitQueue.push(resolve);
    });
  }

  /**
   * V() / signal() — Release the semaphore
   * If waitQueue has blocked processes, wake the first one.
   * Otherwise, increment count.
   */
  release() {
    if (this._waitQueue.length > 0) {
      const resolve = this._waitQueue.shift(); // FIFO — fair scheduling
      resolve(); // Wake the waiting process
    } else {
      this._count++;
    }
  }

  get count() {
    return this._count;
  }

  get waitingCount() {
    return this._waitQueue.length;
  }
}

class Mutex extends Semaphore {
  constructor() {
    super(1); // Binary semaphore
    this._owner = null;
  }

  async lock(ownerId) {
    await this.acquire();
    this._owner = ownerId;
  }

  unlock(ownerId) {
    if (this._owner !== ownerId) {
      throw new Error(`Mutex violation: ${ownerId} cannot unlock mutex owned by ${this._owner}`);
    }
    this._owner = null;
    this.release();
  }

  get owner() {
    return this._owner;
  }

  get isLocked() {
    return this._count === 0;
  }
}

// ─── Ride Lock Registry ────────────────────────────────────────────────────
// Each active ride gets its own binary semaphore.
// Acquired when driver accepts → Released only on completion or valid cancellation.

class RideLockRegistry {
  constructor() {
    this._locks = new Map(); // rideId → Mutex
    this._requestMutex = new Mutex(); // Global: one booking attempt at a time
  }

  /**
   * Create a ride lock. Called when ride is CREATED.
   */
  createRideLock(rideId) {
    if (this._locks.has(rideId)) {
      throw new Error(`Ride lock already exists for ${rideId}`);
    }
    const mutex = new Mutex();
    this._locks.set(rideId, mutex);
    return mutex;
  }

  /**
   * Acquire ride lock. Called when driver ACCEPTS the ride.
   * Prevents driver from abandoning without going through proper flow.
   */
  async acquireRideLock(rideId, driverId) {
    const mutex = this._locks.get(rideId);
    if (!mutex) throw new Error(`No lock found for ride ${rideId}`);
    await mutex.lock(driverId);
    console.log(`[Semaphore] Driver ${driverId} acquired lock on ride ${rideId}`);
    return mutex;
  }

  /**
   * Release ride lock. Called on COMPLETION or VALID CANCELLATION.
   * Valid cancellation = before driver starts moving, or emergency.
   */
  releaseRideLock(rideId, driverId) {
    const mutex = this._locks.get(rideId);
    if (!mutex) throw new Error(`No lock found for ride ${rideId}`);
    mutex.unlock(driverId);
    console.log(`[Semaphore] Driver ${driverId} released lock on ride ${rideId}`);
  }

  /**
   * Destroy ride lock when ride is fully done.
   */
  destroyRideLock(rideId) {
    this._locks.delete(rideId);
  }

  /**
   * Global request mutex — only ONE booking request can be in-flight per user.
   * Prevents double-booking race condition.
   */
  async acquireRequestSlot(userId) {
    await this._requestMutex.lock(userId);
    console.log(`[Mutex] User ${userId} acquired booking slot`);
  }

  releaseRequestSlot(userId) {
    this._requestMutex.unlock(userId);
    console.log(`[Mutex] User ${userId} released booking slot`);
  }

  getStatus(rideId) {
    const mutex = this._locks.get(rideId);
    if (!mutex) return null;
    return {
      isLocked: mutex.isLocked,
      owner: mutex.owner,
      waitingCount: mutex.waitingCount,
    };
  }
}

export const rideLockRegistry = new RideLockRegistry();
export { Semaphore, Mutex };
