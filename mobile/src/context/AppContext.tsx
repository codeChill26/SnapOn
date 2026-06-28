import React, { createContext, useContext, useState, useCallback } from 'react';
import { Task, TaskApplication, Wallet, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  tasks: Task[];
  applications: TaskApplication[];
  wallet: Wallet | null;
  userRole: UserRole;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setApplications: (apps: TaskApplication[]) => void;
  addApplication: (app: TaskApplication) => void;
  setWallet: (wallet: Wallet | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const userRole: UserRole = user?.role || 'USER';

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const addApplication = useCallback((app: TaskApplication) => {
    setApplications(prev => [app, ...prev]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        tasks,
        applications,
        wallet,
        userRole,
        setTasks,
        addTask,
        updateTask,
        setApplications,
        addApplication,
        setWallet,
      }}
    >
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
