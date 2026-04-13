// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import useAppStore from '../store/useAppStore';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/passenger/HomeScreen';
import BookingScreen from '../screens/passenger/BookingScreen';
import RideTrackingScreen from '../screens/passenger/RideTrackingScreen';
import RideHistoryScreen from '../screens/passenger/RideHistoryScreen';
import ProfileScreen from '../screens/passenger/ProfileScreen';
import SOSScreen from '../screens/passenger/SOSScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import OSDashboardScreen from '../screens/OSDashboardScreen';
import RideAcceptScreen from '../screens/driver/RideAcceptScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: Colors.background },
};

function TabIcon({ name, focused }) {
  const icons = {
    Home: focused ? '🏠' : '🏡',
    Rides: focused ? '🚗' : '🚙',
    Profile: focused ? '👤' : '🧑',
    Earnings: focused ? '💰' : '💵',
    OS: focused ? '⚙️' : '🔧',
  };
  return (
    <View style={tabStyles.iconContainer}>
      <Text style={tabStyles.icon}>{icons[name] || '•'}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{name}</Text>
    </View>
  );
}

function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Rides"
        component={RideHistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Rides" focused={focused} /> }}
      />
      <Tab.Screen
        name="OS"
        component={OSDashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="OS" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Earnings"
        component={DriverEarningsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Earnings" focused={focused} /> }}
      />
      <Tab.Screen
        name="OS"
        component={OSDashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="OS" focused={focused} /> }}
      />
      <Tab.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const userRole = useAppStore((s) => s.userRole);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="PassengerApp" component={PassengerTabs} />
        <Stack.Screen name="DriverApp" component={DriverTabs} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="RideTracking" component={RideTrackingScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="RideAccept" component={RideAcceptScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  iconContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 9,
    fontFamily: Typography.bodyMedium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  labelActive: {
    color: Colors.primary,
  },
});
