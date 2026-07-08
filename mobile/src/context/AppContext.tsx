import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { TaskApplication, Wallet, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  applications: TaskApplication[];
  wallet: Wallet | null;
  userRole: UserRole;
  setApplications: (apps: TaskApplication[]) => void;
  addApplication: (app: TaskApplication) => void;
  setWallet: (wallet: Wallet | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      setApplications([]);
    }
  }, [user]);

  const userRole: UserRole = user?.role || 'USER';

  const addApplication = useCallback((app: TaskApplication) => {
    setApplications(prev => [app, ...prev]);
  }, []);

  const value = useMemo(() => ({
    applications,
    wallet,
    userRole,
    setApplications,
    addApplication,
    setWallet,
  }), [applications, wallet, userRole, addApplication]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Compatibility hook for Wallet
export const useWallet = () => {
  const { wallet, setWallet } = useApp();
  return { wallet, setWallet };
};

// Compatibility hook for Task Applications
export const useTaskContext = () => {
  const { applications, setApplications, addApplication } = useApp();
  return { applications, setApplications, addApplication };
};
