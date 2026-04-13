// src/services/SOSInterruptHandler.js
// OS Concept: Hardware Interrupt Handling + Interrupt Priority (IRQ levels)
//
// Problem Solved:
//   - Safety emergencies in Uber/Ola are handled too slowly via UI taps
//   - No guaranteed delivery of SOS signal if app is in background
//   - Regular ride operations shouldn't be blocked by SOS handling
//
// Solution: Interrupt-driven SOS system
//   The SOS event is treated like a hardware interrupt (IRQ):
//   1. Immediately PREEMPTS all current operations (highest priority)
//   2. Saves current process state (ISR entry — like saving CPU registers)
//   3. Runs SOS Interrupt Service Routine (ISR):
//      - Broadcast location to emergency contacts
//      - Alert platform (escalate to human agents)
//      - Start continuous location streaming
//   4. Returns control to ride process (ISR exit)
//
// IRQ Levels (by priority):
//   IRQ0 — SOS / Medical emergency (NMI — Non-Maskable Interrupt, cannot be ignored)
//   IRQ1 — Ride completion errors
//   IRQ2 — Driver disconnect
//   IRQ3 — Payment failure
//   IRQ4 — GPS loss

export const IRQ = Object.freeze({
  SOS: 0,           // NMI — cannot be masked
  RIDE_ERROR: 1,
  DRIVER_DISCONNECT: 2,
  PAYMENT_FAILURE: 3,
  GPS_LOSS: 4,
});

const IRQ_LABELS = {
  [IRQ.SOS]: 'SOS Emergency',
  [IRQ.RIDE_ERROR]: 'Ride Error',
  [IRQ.DRIVER_DISCONNECT]: 'Driver Disconnected',
  [IRQ.PAYMENT_FAILURE]: 'Payment Failed',
  [IRQ.GPS_LOSS]: 'GPS Signal Lost',
};

class InterruptVector {
  constructor() {
    this._handlers = new Map(); // IRQ level → [ISR functions]
    this._interruptLog = [];
    this._masked = new Set(); // Masked IRQs (SOS can never be masked)
    this._isProcessing = false;
    this._interruptQueue = []; // Pending interrupts (if CPU is busy)
  }

  // ─── Register ISR ────────────────────────────────────────────────────────

  registerISR(irqLevel, handler, label = '') {
    if (!this._handlers.has(irqLevel)) this._handlers.set(irqLevel, []);
    this._handlers.get(irqLevel).push({ handler, label });
  }

  // ─── Mask/Unmask interrupts (not applicable to IRQ0/SOS) ────────────────

  mask(irqLevel) {
    if (irqLevel === IRQ.SOS) {
      console.warn('[IRQ] Cannot mask SOS interrupt — it is a Non-Maskable Interrupt (NMI)');
      return false;
    }
    this._masked.add(irqLevel);
    return true;
  }

  unmask(irqLevel) {
    this._masked.delete(irqLevel);
  }

  // ─── Raise Interrupt ─────────────────────────────────────────────────────

  async raise(irqLevel, context = {}) {
    // SOS bypasses masking — NMI
    if (irqLevel !== IRQ.SOS && this._masked.has(irqLevel)) {
      console.log(`[IRQ] IRQ${irqLevel} is masked, ignoring`);
      return;
    }

    const interrupt = {
      irqLevel,
      label: IRQ_LABELS[irqLevel] || `IRQ${irqLevel}`,
      context,
      raisedAt: Date.now(),
      id: `IRQ_${irqLevel}_${Date.now()}`,
    };

    this._interruptLog.push(interrupt);
    console.log(`[IRQ] Raised: ${interrupt.label} (IRQ${irqLevel})`);

    // SOS preempts everything, others are queued
    if (irqLevel === IRQ.SOS) {
      await this._dispatch(interrupt); // Immediate, preemptive
    } else {
      if (this._isProcessing) {
        this._interruptQueue.push(interrupt); // Queue lower-priority interrupts
      } else {
        await this._dispatch(interrupt);
        await this._drainQueue();
      }
    }
  }

  // ─── ISR Dispatch ────────────────────────────────────────────────────────

  async _dispatch(interrupt) {
    this._isProcessing = true;
    const handlers = this._handlers.get(interrupt.irqLevel) || [];

    for (const { handler, label } of handlers) {
      try {
        console.log(`[IRQ] Executing ISR: ${label || 'anonymous'} for ${interrupt.label}`);
        await handler(interrupt.context);
      } catch (err) {
        console.error(`[IRQ] ISR failed for ${interrupt.label}:`, err);
      }
    }

    interrupt.handledAt = Date.now();
    interrupt.latencyMs = interrupt.handledAt - interrupt.raisedAt;
    this._isProcessing = false;
  }

  async _drainQueue() {
    // Process queued interrupts in priority order
    this._interruptQueue.sort((a, b) => a.irqLevel - b.irqLevel);
    while (this._interruptQueue.length > 0) {
      const next = this._interruptQueue.shift();
      await this._dispatch(next);
    }
  }

  get log() {
    return [...this._interruptLog];
  }
}

// ─── SOS Service ─────────────────────────────────────────────────────────────

class SOSService {
  constructor() {
    this._irqVector = new InterruptVector();
    this._isSOSActive = false;
    this._sosStartTime = null;
    this._locationStream = null;
    this._emergencyContacts = [];

    // Register the SOS ISR
    this._irqVector.registerISR(IRQ.SOS, this._sosISR.bind(this), 'SOS Main Handler');
    this._irqVector.registerISR(IRQ.DRIVER_DISCONNECT, this._driverDisconnectISR.bind(this), 'Driver Reconnect');
    this._irqVector.registerISR(IRQ.GPS_LOSS, this._gpsLossISR.bind(this), 'GPS Recovery');
  }

  // ─── SOS Activation ─────────────────────────────────────────────────────

  async triggerSOS(context = {}) {
    console.log('[SOS] *** SOS INTERRUPT RAISED ***');
    await this._irqVector.raise(IRQ.SOS, {
      userId: context.userId,
      rideId: context.rideId,
      location: context.location,
      message: context.message || 'Emergency SOS triggered',
      triggeredAt: Date.now(),
    });
  }

  async _sosISR(context) {
    this._isSOSActive = true;
    this._sosStartTime = Date.now();

    console.log('[SOS ISR] Executing emergency protocol...');

    // Step 1: Broadcast to emergency contacts (parallel — like DMA)
    const contactPromises = this._emergencyContacts.map((contact) =>
      this._alertContact(contact, context)
    );

    // Step 2: Alert platform (priority escalation to human agents)
    const platformAlert = this._alertPlatform(context);

    // Step 3: Begin continuous location stream
    this._startEmergencyLocationStream(context.location);

    // Step 4: Local device notification (always succeeds — NMI guarantee)
    this._triggerLocalAlert();

    await Promise.allSettled([...contactPromises, platformAlert]);
    console.log('[SOS ISR] Emergency protocol complete');
  }

  async _alertContact(contact, context) {
    // In production: SMS via Twilio, push notification, etc.
    console.log(`[SOS] Alerting contact: ${contact.name} at ${contact.phone}`);
    // Simulate async send
    await new Promise((r) => setTimeout(r, 100));
    return { contact: contact.name, sent: true, timestamp: Date.now() };
  }

  async _alertPlatform(context) {
    console.log('[SOS] Alerting RidOS platform — escalating to human agent');
    await new Promise((r) => setTimeout(r, 200));
  }

  _startEmergencyLocationStream(lastKnownLocation) {
    console.log('[SOS] Starting emergency location stream at 5s intervals');
    this._locationStream = setInterval(() => {
      console.log(`[SOS] Broadcasting location: ${JSON.stringify(lastKnownLocation)}`);
    }, 5000);
  }

  _triggerLocalAlert() {
    // Haptics + loud alert — this is a direct hardware call, always works
    console.log('[SOS] LOCAL ALERT: Vibrating device, playing SOS sound');
  }

  deactivateSOS() {
    if (this._locationStream) {
      clearInterval(this._locationStream);
      this._locationStream = null;
    }
    this._isSOSActive = false;
    console.log('[SOS] SOS deactivated');
  }

  async _driverDisconnectISR(context) {
    console.log('[IRQ] Driver disconnected — attempting reconnection...');
    // Trigger ride state recovery
  }

  async _gpsLossISR(context) {
    console.log('[IRQ] GPS signal lost — switching to network location...');
    // Fallback to cell tower location
  }

  setEmergencyContacts(contacts) {
    this._emergencyContacts = contacts;
  }

  raiseIRQ(irqLevel, context) {
    return this._irqVector.raise(irqLevel, context);
  }

  get isActive() {
    return this._isSOSActive;
  }

  get interruptLog() {
    return this._irqVector.log;
  }
}

export const sosService = new SOSService();
export { InterruptVector, IRQ };
