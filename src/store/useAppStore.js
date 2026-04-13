// src/store/useAppStore.js
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // ─── Auth ──────────────────────────────────────────────────────────────
  user: null,
  userRole: 'passenger', // 'passenger' | 'driver'
  setUser: (user) => set({ user }),
  setUserRole: (role) => set({ userRole: role }),

  // ─── Location ──────────────────────────────────────────────────────────
  currentLocation: null,
  setCurrentLocation: (loc) => set({ currentLocation: loc }),

  // ─── Ride Booking ──────────────────────────────────────────────────────
  pickupLocation: null,
  dropoffLocation: null,
  selectedRideType: 'mini',
  rideEstimate: null,
  activeRide: null,
  rideHistory: [],

  setPickupLocation: (loc) => set({ pickupLocation: loc }),
  setDropoffLocation: (loc) => set({ dropoffLocation: loc }),
  setSelectedRideType: (type) => set({ selectedRideType: type }),
  setRideEstimate: (est) => set({ rideEstimate: est }),
  setActiveRide: (ride) => set({ activeRide: ride }),

  addToRideHistory: (ride) =>
    set((state) => ({ rideHistory: [ride, ...state.rideHistory] })),

  // ─── Driver State ──────────────────────────────────────────────────────
  driverStatus: 'offline', // 'online' | 'offline' | 'busy'
  pendingRideRequest: null,
  driverEarnings: { today: 0, week: 0, total: 0 },
  driverRating: 4.8,

  setDriverStatus: (status) => set({ driverStatus: status }),
  setPendingRideRequest: (req) => set({ pendingRideRequest: req }),
  updateDriverEarnings: (amount) =>
    set((state) => ({
      driverEarnings: {
        today: state.driverEarnings.today + amount,
        week: state.driverEarnings.week + amount,
        total: state.driverEarnings.total + amount,
      },
    })),

  // ─── SOS ──────────────────────────────────────────────────────────────
  sosActive: false,
  emergencyContacts: [
    { name: 'Emergency Contact 1', phone: '+91-9999999999', relation: 'Family' },
    { name: 'Emergency Contact 2', phone: '+91-8888888888', relation: 'Friend' },
  ],
  setSosActive: (val) => set({ sosActive: val }),
  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),

  // ─── OS Dashboard (for debug/showcase) ───────────────────────────────
  schedulerStats: { q0: 0, q1: 0, q2: 0, idleDrivers: 0, busyDrivers: 0 },
  cacheStats: { hitRate: 0, size: 0, evictions: 0 },
  locationBufferStats: { isStationary: false, currentPollRateMs: 1000 },
  setSchedulerStats: (stats) => set({ schedulerStats: stats }),
  setCacheStats: (stats) => set({ cacheStats: stats }),
  setLocationBufferStats: (stats) => set({ locationBufferStats: stats }),

  // ─── UI ────────────────────────────────────────────────────────────────
  mapRegion: {
    latitude: 13.0827,
    longitude: 80.2707,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
  setMapRegion: (region) => set({ mapRegion: region }),
  isLoading: false,
  setLoading: (val) => set({ isLoading: val }),
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

export default useAppStore;
