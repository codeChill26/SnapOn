import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';
import { socketService } from '../services/socketService';

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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (token && user) {
      socketService.connect(user.id);

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
      const storedUser = await storage.getUserData();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (newToken: string) => {
    try {
      const userData = await authService.syncUser(newToken);
      await storage.setToken(newToken);
      await storage.setUserData(userData);
      await storage.setRole(userData.role);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await storage.clearAll();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    storage.setUserData(updatedUser);
  }, []);

  const switchRole = useCallback(async (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      await storage.setUserData(updatedUser);
      await storage.setRole(role);
    }
  }, [user]);

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
