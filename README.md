# CronCab 🚖

**A next-generation ride-hailing app built with Operating Systems principles at its core.**

> Solving the real problems of Ola/Uber users through OS-inspired architecture.

---

## 🧠 OS Concepts Applied

| Problem (Ola/Uber) | OS Concept Applied | Implementation |
|---|---|---|
| Surge pricing feels unfair & opaque | **Scheduling Algorithms** (Priority + Round-Robin) | `DriverScheduler` uses multi-level queue: demand zones get fair-share time slices |
| Long wait times / driver ghosting | **Deadlock Prevention** (Banker's Algorithm) | `RideAllocator` pre-checks driver resource availability before confirming |
| App crashes mid-ride | **Process State Machine + Checkpointing** | `RideStateManager` persists FSM state; resumes from last checkpoint on crash |
| Drivers cancel frequently | **Semaphore-based Commit Protocol** | Atomic ride-lock using semaphore; driver cannot unlock until ride completes |
| Unfair driver distribution | **Aging in Scheduling** | Idle drivers get priority boost over time — prevents driver starvation |
| Peak-time app lag | **Virtual Memory / Paging** | `TileCache` uses LRU page-replacement for map tiles; evicts cold tiles |
| Safety: no SOS tracking | **Interrupt Handling** | Hardware interrupt-like SOS; preempts all processes, escalates immediately |
| Battery drain | **CPU Scheduling (Tickless Kernel)** | Location polling uses exponential backoff; reduces wake-ups when stationary |
| Duplicate ride requests | **Mutex Locks** | `RequestMutex` ensures one active request per user at a time |
| Driver location jitter | **Buffering / Smoothing** | Circular buffer of last N GPS readings; median-filtered output |

---

## 📁 Project Structure

```
RidOS/
├── src/
│   ├── screens/          # UI screens (Passenger & Driver flows)
│   ├── components/       # Reusable UI components
│   ├── services/         # OS-concept service layer
│   │   ├── DriverScheduler.js       # Multi-level queue scheduling
│   │   ├── RideStateManager.js      # FSM + checkpointing
│   │   ├── RideAllocator.js         # Deadlock-free allocation
│   │   ├── SemaphoreService.js      # Mutex/Semaphore primitives
│   │   ├── MapTileCache.js          # LRU page replacement
│   │   ├── LocationBuffer.js        # Circular buffer for GPS
│   │   ├── SOSInterruptHandler.js   # Interrupt-like SOS
│   │   └── BatteryAwarePoller.js    # Tickless polling
│   ├── store/            # Zustand global state
│   ├── navigation/       # React Navigation config
│   ├── utils/            # Helpers and formatters
│   ├── hooks/            # Custom React hooks
│   └── constants/        # Theme, colors, config
├── app.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Studio

### Installation

```bash
git clone https://github.com/yourusername/CronCab.git
cd RidOS
npm install
npx expo start
```

Press `i` for iOS, `a` for Android, or scan QR with Expo Go.

---

## 🏗️ Architecture Deep Dive

### 1. Driver Scheduling — Multi-Level Feedback Queue

```
High Priority Queue  → SOS, Medical rides
Medium Priority Queue → Pre-booked rides  
Low Priority Queue   → Regular on-demand
```
Drivers age up priority queues if starved > 3 minutes (prevents indefinite postponement).

### 2. Ride State Machine — Checkpointing

```
IDLE → SEARCHING → DRIVER_ASSIGNED → EN_ROUTE_PICKUP
     → ARRIVED_PICKUP → IN_RIDE → COMPLETED / CANCELLED
```
Each state transition is atomically checkpointed to AsyncStorage. On app resume, state is restored exactly.

### 3. Deadlock Prevention — Banker's Algorithm

Before assigning a driver, the allocator checks:
- Available drivers in zone
- Max demand (historical peak)
- Currently allocated drivers

Only assigns if the system remains in a **safe state**.

### 4. Semaphore Ride-Lock

When a driver accepts a ride:
```
P(rideSemaphore)  ← Driver acquires lock
  [Ride in progress — neither party can cancel arbitrarily]
V(rideSemaphore)  ← Released only on completion/valid cancel
```

### 5. LRU Map Tile Cache

Map tiles are paged in/out using an LRU eviction policy:
- Cache size: 50 tiles (configurable)
- On cache miss → fetch from network
- On cache hit → serve from memory (O(1) lookup via HashMap + DLL)

---

## 👥 User Roles

- **Passenger** — Book rides, track driver, SOS, ride history
- **Driver** — Accept/decline rides, earnings dashboard, status toggle

---

## 🔒 Key Safety Features

- **SOS Interrupt**: Instantly shares live location with 3 emergency contacts + local authorities
- **Ride Checkpointing**: No lost rides on crash/reboot
- **Semaphore Cancel Prevention**: Prevents driver-side ghosting after acceptance
- **Deadlock-free Zone Allocation**: No resource lock contention between zones

---

## 📄 License

MIT — see [LICENSE](LICENSE)
