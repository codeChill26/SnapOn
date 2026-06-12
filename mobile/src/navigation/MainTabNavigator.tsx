import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PostJobScreen } from '../screens/postJob/PostJobScreen';
import { WorkerDashboardScreen } from '../screens/worker/WorkerDashboardScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { UserRole } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface TabConfig {
  name: string;
  label: string;
  iconFocused: string;
  iconOutline: string;
  component: React.ComponentType<any>;
  roles: UserRole[];
}

const tabConfigs: TabConfig[] = [
  { name: 'Home', label: 'Trang chủ', iconFocused: 'home', iconOutline: 'home-outline', component: HomeScreen, roles: ['hirer', 'worker'] },
  { name: 'PostJob', label: 'Đăng việc', iconFocused: 'add-circle', iconOutline: 'add-circle-outline', component: PostJobScreen, roles: ['hirer'] },
  { name: 'WorkerDashboard', label: 'Việc gần', iconFocused: 'map', iconOutline: 'map-outline', component: WorkerDashboardScreen, roles: ['worker'] },
  { name: 'ChatList', label: 'Tin nhắn', iconFocused: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline', component: ChatListScreen, roles: ['hirer', 'worker'] },
  { name: 'Activity', label: 'Hoạt động', iconFocused: 'clipboard', iconOutline: 'clipboard-outline', component: ActivityScreen, roles: ['hirer', 'worker'] },
  { name: 'Profile', label: 'Cá nhân', iconFocused: 'person', iconOutline: 'person-outline', component: ProfileScreen, roles: ['hirer', 'worker'] },
];

export type MainTabParamList = {
  Home: undefined;
  PostJob: undefined;
  WorkerDashboard: undefined;
  ChatList: undefined;
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
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? (tab.iconFocused as any) : (tab.iconOutline as any)}
                size={size || 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};
