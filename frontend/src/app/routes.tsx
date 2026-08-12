import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './pages/Root';
import Home from './pages/Home';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import JobDetail from './pages/JobDetail';
import WorkerDashboard from './pages/WorkerDashboard';
import Profile from './pages/Profile';
import Activity from './pages/Activity';
import { AdminRoot } from './pages/admin/AdminRoot';
import Dashboard from './pages/admin/Dashboard';
import JobsManagement from './pages/admin/JobsManagement';
import UsersManagement from './pages/admin/UsersManagement';
import WithdrawalsManagement from './pages/admin/WithdrawalsManagement';

function RedirectHome() {
  return <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },

      // Auth
      { path: 'login', Component: Login },

      // Hirer
      { path: 'post', Component: PostJob },

      // Common
      { path: 'job/:id', Component: JobDetail },
      { path: 'job', Component: RedirectHome },
      { path: 'activity', Component: Activity },
      { path: 'profile', Component: Profile },

      // Worker
      { path: 'worker', Component: WorkerDashboard },

      // Admin
      {
        path: 'admin',
        Component: AdminRoot,
        children: [
          { index: true, Component: Dashboard },
          { path: 'jobs', Component: JobsManagement },
          { path: 'users', Component: UsersManagement },
          { path: 'withdrawals', Component: WithdrawalsManagement },
        ],
      },
    ],
  },
]);