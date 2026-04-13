// src/services/RideStateManager.js
// OS Concept: Process State Machine + Checkpointing / Recovery
//
// Problem Solved:
//   - App crashes mid-ride → user loses track of driver, has to rebook
//   - No clarity on ride lifecycle (what's happening right now?)
//
// Solution:
//   Rides are modelled as processes with a strict Finite State Machine.
//   Each state transition is atomically checkpointed (like OS process state saved to disk).
//   On app resume / crash recovery, the last valid checkpoint is restored.
//
// States (Process States analogy):
//   NEW → SEARCHING (like NEW → READY)
//   SEARCHING → DRIVER_ASSIGNED (READY → RUNNING)
//   DRIVER_ASSIGNED → EN_ROUTE_TO_PICKUP
//   EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP
//   ARRIVED_AT_PICKUP → IN_RIDE (like context switch)
//   IN_RIDE → COMPLETING → COMPLETED
//   Any state → CANCELLED (like SIGKILL)
//   Any state → FAILED (like process crash)

import AsyncStorage from '@react-native-async-storage/async-storage';

export const RideState = Object.freeze({
  NEW: 'NEW',
  SEARCHING: 'SEARCHING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  EN_ROUTE_TO_PICKUP: 'EN_ROUTE_TO_PICKUP',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  IN_RIDE: 'IN_RIDE',
  COMPLETING: 'COMPLETING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
});

// Valid transitions — only these are allowed (like OS scheduler rules)
const VALID_TRANSITIONS = {
  [RideState.NEW]: [RideState.SEARCHING, RideState.CANCELLED],
  [RideState.SEARCHING]: [RideState.DRIVER_ASSIGNED, RideState.CANCELLED, RideState.FAILED],
  [RideState.DRIVER_ASSIGNED]: [RideState.EN_ROUTE_TO_PICKUP, RideState.CANCELLED],
  [RideState.EN_ROUTE_TO_PICKUP]: [RideState.ARRIVED_AT_PICKUP, RideState.CANCELLED],
  [RideState.ARRIVED_AT_PICKUP]: [RideState.IN_RIDE, RideState.CANCELLED],
  [RideState.IN_RIDE]: [RideState.COMPLETING],
  [RideState.COMPLETING]: [RideState.COMPLETED, RideState.FAILED],
  [RideState.COMPLETED]: [],
  [RideState.CANCELLED]: [],
  [RideState.FAILED]: [RideState.SEARCHING], // Retry allowed
};

const STATE_METADATA = {
  [RideState.NEW]: { label: 'Creating Ride', icon: '⏳', color: '#8888A8' },
  [RideState.SEARCHING]: { label: 'Finding your driver...', icon: '🔍', color: '#F5A623' },
  [RideState.DRIVER_ASSIGNED]: { label: 'Driver assigned!', icon: '✅', color: '#00C896' },
  [RideState.EN_ROUTE_TO_PICKUP]: { label: 'Driver on the way', icon: '🚗', color: '#00E5FF' },
  [RideState.ARRIVED_AT_PICKUP]: { label: 'Driver arrived', icon: '📍', color: '#00E5FF' },
  [RideState.IN_RIDE]: { label: 'Ride in progress', icon: '🛣️', color: '#00C896' },
  [RideState.COMPLETING]: { label: 'Completing ride...', icon: '🏁', color: '#F5A623' },
  [RideState.COMPLETED]: { label: 'Ride completed', icon: '⭐', color: '#00C896' },
  [RideState.CANCELLED]: { label: 'Ride cancelled', icon: '❌', color: '#FF3B5C' },
  [RideState.FAILED]: { label: 'Something went wrong', icon: '⚠️', color: '#FFB020' },
};

const CHECKPOINT_KEY_PREFIX = 'ridos_checkpoint_';

class RideProcess {
  constructor(rideId, initialData = {}) {
    this.rideId = rideId;
    this.state = RideState.NEW;
    this.history = []; // Audit log of all transitions
    this.data = initialData;
    this.createdAt = Date.now();
    this.lastCheckpoint = null;
    this._listeners = new Map(); // state → [callbacks]
  }

  // ─── Transition ─────────────────────────────────────────────────────────

  async transition(newState, payload = {}) {
    const validNext = VALID_TRANSITIONS[this.state];
    if (!validNext.includes(newState)) {
      throw new Error(
        `[RideStateManager] Invalid transition: ${this.state} → ${newState} for ride ${this.rideId}`
      );
    }

    const previousState = this.state;
    this.state = newState;
    this.data = { ...this.data, ...payload };

    const entry = {
      from: previousState,
      to: newState,
      timestamp: Date.now(),
      payload,
    };
    this.history.push(entry);

    // Atomically checkpoint every transition (like process PCB save)
    await this._checkpoint();

    // Notify listeners
    this._notifyListeners(newState, entry);

    console.log(`[RideProcess ${this.rideId}] ${previousState} → ${newState}`);
    return entry;
  }

  // ─── Checkpointing ──────────────────────────────────────────────────────

  async _checkpoint() {
    const checkpoint = {
      rideId: this.rideId,
      state: this.state,
      data: this.data,
      history: this.history,
      createdAt: this.createdAt,
      checkpointedAt: Date.now(),
    };
    this.lastCheckpoint = checkpoint;

    try {
      await AsyncStorage.setItem(
        `${CHECKPOINT_KEY_PREFIX}${this.rideId}`,
        JSON.stringify(checkpoint)
      );
    } catch (err) {
      console.error('[Checkpoint] Failed to persist checkpoint:', err);
      // Non-fatal: in-memory state is still valid
    }
  }

  // ─── Restore from checkpoint (crash recovery) ──────────────────────────

  static async restore(rideId) {
    try {
      const raw = await AsyncStorage.getItem(`${CHECKPOINT_KEY_PREFIX}${rideId}`);
      if (!raw) return null;

      const checkpoint = JSON.parse(raw);
      const process = new RideProcess(rideId, checkpoint.data);
      process.state = checkpoint.state;
      process.history = checkpoint.history;
      process.createdAt = checkpoint.createdAt;
      process.lastCheckpoint = checkpoint;

      console.log(`[Recovery] Ride ${rideId} restored from checkpoint at state: ${checkpoint.state}`);
      return process;
    } catch (err) {
      console.error('[Recovery] Failed to restore checkpoint:', err);
      return null;
    }
  }

  // ─── Listeners ──────────────────────────────────────────────────────────

  on(state, callback) {
    if (!this._listeners.has(state)) this._listeners.set(state, []);
    this._listeners.get(state).push(callback);
    return () => this.off(state, callback); // Return unsubscribe fn
  }

  off(state, callback) {
    const list = this._listeners.get(state);
    if (list) this._listeners.set(state, list.filter((cb) => cb !== callback));
  }

  _notifyListeners(state, entry) {
    const callbacks = this._listeners.get(state) || [];
    callbacks.forEach((cb) => cb(entry));
    const wildcardCallbacks = this._listeners.get('*') || [];
    wildcardCallbacks.forEach((cb) => cb(entry));
  }

  // ─── Getters ────────────────────────────────────────────────────────────

  get metadata() {
    return STATE_METADATA[this.state];
  }

  get isTerminal() {
    return [RideState.COMPLETED, RideState.CANCELLED, RideState.FAILED].includes(this.state);
  }

  get isActive() {
    return [
      RideState.SEARCHING,
      RideState.DRIVER_ASSIGNED,
      RideState.EN_ROUTE_TO_PICKUP,
      RideState.ARRIVED_AT_PICKUP,
      RideState.IN_RIDE,
      RideState.COMPLETING,
    ].includes(this.state);
  }

  toJSON() {
    return {
      rideId: this.rideId,
      state: this.state,
      metadata: this.metadata,
      data: this.data,
      history: this.history,
      isActive: this.isActive,
      isTerminal: this.isTerminal,
    };
  }

  // Cleanup checkpoint after ride is done
  async cleanup() {
    try {
      await AsyncStorage.removeItem(`${CHECKPOINT_KEY_PREFIX}${this.rideId}`);
    } catch (_) {}
  }
}

// ─── Process Manager ────────────────────────────────────────────────────────
// Global registry of all active ride processes (like OS Process Table)

class RideProcessManager {
  constructor() {
    this._processes = new Map(); // rideId → RideProcess
  }

  create(rideId, data) {
    const process = new RideProcess(rideId, data);
    this._processes.set(rideId, process);
    return process;
  }

  get(rideId) {
    return this._processes.get(rideId);
  }

  async getOrRestore(rideId) {
    if (this._processes.has(rideId)) return this._processes.get(rideId);
    const restored = await RideProcess.restore(rideId);
    if (restored) {
      this._processes.set(rideId, restored);
      return restored;
    }
    return null;
  }

  async restoreAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const checkpointKeys = keys.filter((k) => k.startsWith(CHECKPOINT_KEY_PREFIX));
      for (const key of checkpointKeys) {
        const rideId = key.replace(CHECKPOINT_KEY_PREFIX, '');
        await this.getOrRestore(rideId);
      }
      return Array.from(this._processes.values());
    } catch (err) {
      console.error('[Recovery] restoreAll failed:', err);
      return [];
    }
  }

  terminate(rideId) {
    const process = this._processes.get(rideId);
    if (process) {
      process.cleanup();
      this._processes.delete(rideId);
    }
  }

  getAll() {
    return Array.from(this._processes.values());
  }

  getActive() {
    return this.getAll().filter((p) => p.isActive);
  }
}

export const rideProcessManager = new RideProcessManager();
export { RideProcess, STATE_METADATA, VALID_TRANSITIONS };
