import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { AppProvider } from './src/context/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// ─── High-Priority Foreground Notification Presentation ───────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  useEffect(() => {
    // Configure high-priority Android notification channel for Doctor Calling
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('doctor-calling', {
        name: 'Doctor Calling & Turn Alerts',
        description: 'Loud alert and vibration when doctor calls your token',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 600],
        lightColor: '#0055FE',
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      }).catch(() => {});
    }

    // Request notification permission on Android 13+ & iOS
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <AppProvider>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <RootNavigator />
          </AppProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
