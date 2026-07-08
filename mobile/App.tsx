import './src/utils/consoleGuard';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { NotificationInitializer } from './src/context/NotificationContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme';
import { warmUpBackend } from './src/utils/backendDetector';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

export default function App() {
  useEffect(() => {
    // Ping deployed backend ngay khi app mở để wake up Render.com cold start.
    // Fire-and-forget — chạy ngầm trong khi user đang nhìn màn hình loading/login.
    warmUpBackend();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppProvider>
              <NotificationInitializer>
                <AppNavigator />
                <StatusBar style="auto" />
                <Toast />
              </NotificationInitializer>
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
