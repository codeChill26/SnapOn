import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <AppNavigator />
            <StatusBar style="auto" />
            <Toast />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
