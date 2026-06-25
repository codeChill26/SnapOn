
import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import { HomeScreen } from '../screens/home/HomeScreen';
import { PostJobScreen } from '../screens/postJob/PostJobScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

import { UserRole } from '../types';

export type MainTabParamList = {
  Home: undefined;
  PostJob: { taskId?: string; initialPostType?: 'RECRUITMENT' | 'SERVICE_OFFER' } | undefined;
  ChatList: undefined;
  Activity: undefined;
  Profile: undefined;
};

type TabName = keyof MainTabParamList;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: TabName;
  label: string;
  iconFocused: IoniconName;
  iconOutline: IoniconName;
  component: React.ComponentType<any>;
  roles: UserRole[];
}

const TAB_COLORS = {
  background: '#F7F8FA',
  backgroundElevated: '#FFFFFF',
  activeSurface: '#FFF1EB',

  active: '#FF6B35',
  inactive: '#98A2B3',

  border: '#EAECF0',
  shadow: '#101828',
  white: '#FFFFFF',
};

const tabConfigs: TabConfig[] = [
  {
    name: 'Home',
    label: 'Trang chủ',
    iconFocused: 'home',
    iconOutline: 'home-outline',
    component: HomeScreen,
    roles: ['USER', 'ADMIN', 'hirer', 'worker'],
  },
  {
    name: 'PostJob',
    label: 'Đăng việc',
    iconFocused: 'add',
    iconOutline: 'add',
    component: PostJobScreen,
    roles: ['USER', 'ADMIN', 'hirer', 'worker'],
  },
  {
    name: 'ChatList',
    label: 'Tin nhắn',
    iconFocused: 'chatbubble-ellipses',
    iconOutline: 'chatbubble-ellipses-outline',
    component: ChatListScreen,
    roles: ['USER', 'ADMIN', 'hirer', 'worker'],
  },
  {
    name: 'Activity',
    label: 'Hoạt động',
    iconFocused: 'clipboard',
    iconOutline: 'clipboard-outline',
    component: ActivityScreen,
    roles: ['USER', 'ADMIN', 'hirer', 'worker'],
  },
  {
    name: 'Profile',
    label: 'Cá nhân',
    iconFocused: 'person',
    iconOutline: 'person-outline',
    component: ProfileScreen,
    roles: ['USER', 'ADMIN', 'hirer', 'worker'],
  },
];

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();

  const role: UserRole = user?.role ?? 'USER';

  const visibleTabs = tabConfigs.filter((tab) =>
    tab.roles.includes(role),
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        // React Navigation 7:
        // sceneContainerStyle đã được thay bằng sceneStyle
        sceneStyle: styles.sceneContainer,

        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: TAB_COLORS.active,
        tabBarInactiveTintColor: TAB_COLORS.inactive,

        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,

        tabBarAllowFontScaling: false,
      }}
    >
      {visibleTabs.map((tab) => {
        const isPostJob = tab.name === 'PostJob';

        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarLabel: tab.label,
              tabBarAccessibilityLabel: tab.label,

              tabBarIcon: ({ focused, color, size }) => {
                if (isPostJob) {
                  return (
                    <View
                      style={[
                        styles.postJobButton,
                        focused && styles.postJobButtonFocused,
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={28}
                        color={TAB_COLORS.white}
                      />
                    </View>
                  );
                }

                return (
                  <View
                    style={[
                      styles.iconContainer,
                      focused && styles.iconContainerFocused,
                    ]}
                  >
                    <Ionicons
                      name={
                        focused
                          ? tab.iconFocused
                          : tab.iconOutline
                      }
                      size={size || 22}
                      color={color}
                    />
                  </View>
                );
              },
            }}
          />
        );
      })}
    </Tab.Navigator>


  );
};

const styles = StyleSheet.create({
  sceneContainer: {
    backgroundColor: TAB_COLORS.background,
  },

  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,

    paddingTop: 8,
    paddingBottom:
      Platform.OS === 'ios' ? 25 : 10,

    backgroundColor: TAB_COLORS.backgroundElevated,

    borderTopWidth: 1,
    borderTopColor: TAB_COLORS.border,

    shadowColor: TAB_COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 8,
  },

  tabBarItem: {
    paddingVertical: 2,
  },

  tabBarLabel: {
    marginTop: 2,

    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },

  iconContainer: {
    minWidth: 42,
    height: 32,

    paddingHorizontal: 10,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',
  },

  iconContainerFocused: {
    backgroundColor: TAB_COLORS.activeSurface,
  },

  postJobButton: {
    width: 48,
    height: 48,

    marginTop: -15,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: TAB_COLORS.active,

    borderWidth: 3,
    borderColor: TAB_COLORS.backgroundElevated,

    shadowColor: TAB_COLORS.active,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 6,

    elevation: 6,
  },

  postJobButtonFocused: {
    transform: [{ scale: 1.06 }],

    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
