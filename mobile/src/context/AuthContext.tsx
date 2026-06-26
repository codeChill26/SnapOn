import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';
import { socketService } from '../services/socketService';
import { setOnUnauthorized } from '../services/api';
import { notificationService } from '../services/notificationService';
import { detectBackend } from '../utils/backendDetector';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    loadStoredAuth();

    // Listen for 401 unauthorized events to log out cleanly
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
      Alert.alert(
        'Phiên làm việc hết hạn',
        'Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
        [{ text: 'Đồng ý' }]
      );
    });

    return () => {
      mountedRef.current = false;
      setOnUnauthorized(() => {});
    };
  }, []);

  useEffect(() => {
    if (token && user) {
      socketService.connect(user.id);
      void notificationService.registerDeviceForChatNotifications().catch((error) => {
        console.warn('Failed to register push token:', error);
      });

      const handleApplicationJoined = (data: { taskTitle: string; taskerName: string }) => {
        Alert.alert(
          '💡 Ứng tuyển mới!',
          `Ứng viên ${data.taskerName} đã đăng ký làm công việc: "${data.taskTitle}".`
        );
      };

      const handleTaskAssigned = (data: { taskTitle: string }) => {
        Alert.alert(
          '🎉 Nhận việc thành công!',
          `Bạn đã được chọn cho công việc: "${data.taskTitle}". Vui lòng vào kiểm tra công việc và bắt đầu làm việc!`
        );
      };

      socketService.on('application_joined', handleApplicationJoined);
      socketService.on('task_assigned', handleTaskAssigned);

      return () => {
        socketService.off('application_joined', handleApplicationJoined);
        socketService.off('task_assigned', handleTaskAssigned);
      };
    } else {
      socketService.disconnect();
    }
  }, [token, user]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      if (!storedToken || loginInProgressRef.current) return;

      try {
        const { user: freshUser, wallet } = await authService.tokenLogin();
        if (!loginInProgressRef.current && mountedRef.current) {
          setToken(storedToken);
          setUser(freshUser);
          if (wallet) await storage.setWallet(wallet);
        }
      } catch (err: any) {
        // Access token expired — try refreshing with the stored refresh token
        if (err?.response?.status === 401) {
          const refreshToken = await storage.getRefreshToken();
          if (!refreshToken) {
            await storage.clearAll();
            return;
          }
          try {
            const baseUrl = await detectBackend();
            const refreshRes = await axios.post<any>(
              `${baseUrl}/auth/refresh`,
              { refreshToken }
            );
            const { accessToken: newAccess, refreshToken: newRefresh } = refreshRes.data;
            await storage.setToken(newAccess);
            await storage.setRefreshToken(newRefresh);

            // Retry with the fresh access token
            const { user: freshUser, wallet } = await authService.tokenLogin();
            if (!loginInProgressRef.current && mountedRef.current) {
              setToken(newAccess);
              setUser(freshUser);
              if (wallet) await storage.setWallet(wallet);
            }
          } catch {
            // Refresh token also expired or invalid — force re-login
            await storage.clearAll();
          }
        } else {
          // Network error or server error — keep stored token, just fail silently
          console.error('Failed to load stored auth or auto-login:', err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (firebaseToken: string) => {
    loginInProgressRef.current = true;
    try {
      const { user: userData, accessToken, refreshToken, wallet } = await authService.syncUser(firebaseToken);
      await storage.setToken(accessToken);
      await storage.setRefreshToken(refreshToken);
      await storage.setUserData(userData);
      await storage.setRole(userData.role);
      if (wallet) {
        await storage.setWallet(wallet);
      }
      setToken(accessToken);
      setUser(userData);
      loginInProgressRef.current = false;
    } catch (error) {
      console.error('Login failed:', error);
      loginInProgressRef.current = false;
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken) {
        await authService.logout(refreshToken).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to logout on server:', e);
    } finally {
      await storage.clearAll();
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    storage.setUserData(updatedUser);
  }, []);

  const switchRole = useCallback(async (role: UserRole) => {
    // switchRole is deprecated. All normal accounts now use the unified USER role.
    void role;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        updateUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
