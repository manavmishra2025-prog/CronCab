// App.js
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import useAppStore from './src/store/useAppStore';
import { Colors, Typography } from './src/constants/theme';

// Toast overlay component
function ToastOverlay() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;

  const bgColor = {
    success: Colors.success,
    error: Colors.danger,
    warning: Colors.warning,
    info: Colors.surfaceElevated,
  }[toast.type] || Colors.surfaceElevated;

  return (
    <View style={[styles.toast, { backgroundColor: bgColor }]}>
      <Text style={styles.toastText}>{toast.message}</Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <AppNavigator />
          <ToastOverlay />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'System',
    textAlign: 'center',
  },
});
