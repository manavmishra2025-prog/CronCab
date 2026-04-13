// src/constants/theme.js

export const Colors = {
  // Core palette — deep night + electric amber
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C27',
  border: '#2A2A3A',

  primary: '#F5A623',       // amber — the signal
  primaryDark: '#C47D0E',
  primaryGlow: 'rgba(245,166,35,0.15)',

  accent: '#00E5FF',        // cyan — live data
  accentGlow: 'rgba(0,229,255,0.12)',

  success: '#00C896',
  danger: '#FF3B5C',
  dangerGlow: 'rgba(255,59,92,0.2)',
  warning: '#FFB020',

  textPrimary: '#F0F0F8',
  textSecondary: '#8888A8',
  textMuted: '#4A4A6A',

  driverOnline: '#00C896',
  driverBusy: '#F5A623',
  driverOffline: '#4A4A6A',

  mapOverlay: 'rgba(10,10,15,0.7)',
  cardShadow: 'rgba(0,0,0,0.6)',
};

export const Typography = {
  // Syne for headings — geometric, futuristic
  // DM Sans for body — clean, readable
  heading: 'Syne_700Bold',
  headingMedium: 'Syne_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  mono: 'SpaceMono-Regular',

  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  }),
};

export const RideTypes = [
  {
    id: 'moto',
    label: 'Moto',
    emoji: '🏍️',
    pricePerKm: 8,
    eta: '2 min',
    capacity: 1,
    description: 'Quick solo rides',
  },
  {
    id: 'mini',
    label: 'Mini',
    emoji: '🚗',
    pricePerKm: 12,
    eta: '4 min',
    capacity: 4,
    description: 'Comfortable & affordable',
  },
  {
    id: 'prime',
    label: 'Prime',
    emoji: '🚙',
    pricePerKm: 18,
    eta: '6 min',
    capacity: 4,
    description: 'Premium sedans',
  },
  {
    id: 'suv',
    label: 'SUV',
    emoji: '🚐',
    pricePerKm: 24,
    eta: '8 min',
    capacity: 6,
    description: 'Spacious for groups',
  },
];

export const ZoneColors = {
  low: '#00C896',
  medium: '#F5A623',
  high: '#FF3B5C',
};
