import { Outlet, useLocation } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { Layout } from '../components/Layout';

/**
 * Root wraps AppProvider *inside* the router tree so that
 * the context is always available to every route component,
 * including during React Fast Refresh / HMR cycles.
 */
export function Root() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <AppProvider>
      {isAdminRoute ? <Outlet /> : <Layout />}
    </AppProvider>
  );
}