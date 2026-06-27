import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { warmUpBackend } from './src/utils/backendDetector';

export default function App() {
  useEffect(() => {
    // Ping deployed backend ngay khi app mở để wake up Render.com cold start.
    // Fire-and-forget — chạy ngầm trong khi user đang nhìn màn hình loading/login.
    warmUpBackend();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
