import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { AppProvider } from './src/context/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
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
