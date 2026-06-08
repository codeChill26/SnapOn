import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PostJobScreen } from '../screens/postJob/PostJobScreen';
import { WorkerDashboardScreen } from '../screens/worker/WorkerDashboardScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { UserRole } from '../types';

type TabIcon = { focused: boolean; color: string; size: number };

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{label}</Text>
);

interface TabConfig {
  name: string;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
  roles: UserRole[];
}

const tabConfigs: TabConfig[] = [
  { name: 'Home', label: 'Trang chủ', icon: '🏠', component: HomeScreen, roles: ['hirer', 'worker'] },
  { name: 'PostJob', label: 'Đăng việc', icon: '📝', component: PostJobScreen, roles: ['hirer'] },
  { name: 'WorkerDashboard', label: 'Việc gần', icon: '📍', component: WorkerDashboardScreen, roles: ['worker'] },
  { name: 'Activity', label: 'Hoạt động', icon: '📋', component: ActivityScreen, roles: ['hirer', 'worker'] },
  { name: 'Profile', label: 'Cá nhân', icon: '👤', component: ProfileScreen, roles: ['hirer', 'worker'] },
];

export type MainTabParamList = {
  Home: undefined;
  PostJob: undefined;
  WorkerDashboard: undefined;
  Activity: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'hirer';

  const visibleTabs = tabConfigs.filter(tab => tab.roles.includes(role));

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
      {visibleTabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name as keyof MainTabParamList}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ focused }) => (
              <TabIcon label={tab.icon} focused={focused} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};
