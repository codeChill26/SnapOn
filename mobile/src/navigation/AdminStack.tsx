import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { Colors } from '../constants/colors';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminJobsScreen } from '../screens/admin/AdminJobsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminJobs: undefined;
  AdminUsers: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminStackNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AdminJobs"
        component={AdminJobsScreen}
        options={{
          tabBarLabel: 'Công việc',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: 'Người dùng',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>👥</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
