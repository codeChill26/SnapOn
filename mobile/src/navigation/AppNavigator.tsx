import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminStackNavigator } from './AdminStack';
import { Colors } from '../constants/colors';
import { JobDetailScreen } from '../screens/jobDetail/JobDetailScreen';
import { ApplicantListScreen } from '../screens/jobDetail/ApplicantListScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  AdminTabs: undefined;
  JobDetail: { taskId: string };
  ApplicantList: { taskId: string };
  Wallet: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminStackNavigator} />
            <Stack.Screen
              name="JobDetail"
              component={JobDetailScreen}
              options={{ headerShown: true, headerTitle: 'Chi tiết công việc', headerTintColor: Colors.primary }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="JobDetail"
              component={JobDetailScreen}
              options={{ headerShown: true, headerTitle: 'Chi tiết công việc', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="ApplicantList"
              component={ApplicantListScreen}
              options={{ headerShown: true, headerTitle: 'Ứng viên', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{ headerShown: true, headerTitle: 'Ví của tôi', headerTintColor: Colors.primary }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
