import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminObras from './pages/admin/Obras';
import AdminCatalog from './pages/admin/Catalog';
import AdminOrders from './pages/admin/Orders';
import AdminSettings from './pages/admin/Settings';
import AdminPlans from './pages/admin/Plans';
import AdminAuditLogs from './pages/admin/AuditLogs';
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerReceiving from './pages/worker/Receiving';
import SiteFormPage from './pages/admin/sites/SiteFormPage';
import MaterialFormPage from './pages/admin/catalog/MaterialFormPage';
import SupplierFormPage from './pages/admin/catalog/SupplierFormPage';
import OrderFormPage from './pages/admin/orders/OrderFormPage';
import OrderViewPage from './pages/admin/orders/OrderViewPage';
import UserFormPage from './pages/admin/users/UserFormPage';
import NewOrderPage from './pages/worker/NewOrderPage';
import OrderDetailsPage from './pages/worker/OrderDetailsPage';
import ReceivingConfirmPage from './pages/worker/ReceivingConfirmPage';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, sites(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexDirection: 'column', gap: '20px' }}>
      <div className="loader"></div>
      <div style={{ fontSize: '18px', letterSpacing: '2px', fontWeight: 300, color: 'var(--text-primary)' }}>PEDOBRA</div>
      <style>{`
        .loader {
          width: 40px;
          height: 40px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          !session ? <LandingPage /> :
            !profile ? (
              <div style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexDirection: 'column', gap: '20px' }}>
                <p>Perfil não encontrado no sistema.</p>
                <button className="btn-primary" onClick={() => supabase.auth.signOut()}>Sair e Tentar Novamente</button>
              </div>
            ) : (
              profile.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            )
        } />

        <Route path="/admin" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminDashboard /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/users" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminUsers /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/users/novo" element={
          session && profile?.role === 'admin' ? <AdminLayout><UserFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/users/editar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><UserFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/orders" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminOrders /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/orders/novo" element={
          session && profile?.role === 'admin' ? <AdminLayout><OrderFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/orders/editar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><OrderFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/orders/visualizar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><OrderViewPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/sites" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminObras /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/sites/novo" element={
          session && profile?.role === 'admin' ? <AdminLayout><SiteFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/sites/editar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><SiteFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/materials" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminCatalog /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/materials/novo" element={
          session && profile?.role === 'admin' ? <AdminLayout><MaterialFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/materials/editar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><MaterialFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/suppliers" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminCatalog /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/suppliers/novo" element={
          session && profile?.role === 'admin' ? <AdminLayout><SupplierFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/suppliers/editar/:id" element={
          session && profile?.role === 'admin' ? <AdminLayout><SupplierFormPage /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/settings" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminSettings profile={profile} /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/plans" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminPlans /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/audit-logs" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminAuditLogs /></AdminLayout> : <Navigate to="/" />
        } />

        <Route path="/dashboard" element={
          session && profile?.role === 'worker' ? <WorkerDashboard profile={profile} /> : <Navigate to="/" />
        } />
        <Route path="/dashboard/receipts" element={
          session && profile?.role === 'worker' ? <WorkerReceiving profile={profile} /> : <Navigate to="/" />
        } />
        <Route path="/dashboard/receipts/:id" element={
          session && profile?.role === 'worker' ? <ReceivingConfirmPage profile={profile} /> : <Navigate to="/" />
        } />
        <Route path="/dashboard/pedir" element={
          session && profile?.role === 'worker' ? <NewOrderPage profile={profile} /> : <Navigate to="/" />
        } />
        <Route path="/dashboard/pedido/:id" element={
          session && profile?.role === 'worker' ? <OrderDetailsPage /> : <Navigate to="/" />
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
