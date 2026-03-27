import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Lock } from 'lucide-react';
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
import AdminReports from './pages/admin/Reports';
import MasterDashboard from './pages/admin/MasterDashboard';
import MasterFinanceiro from './pages/admin/MasterFinanceiro';
import MasterLinks from './pages/admin/MasterLinks';
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
import { SubscriptionGuard } from './components/SubscriptionGuard';

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

  const fetchProfile = async (id: string, retryCount = 0) => {
    if (retryCount === 0) setLoading(true);
    if (retryCount > 0) setProfile('fetching');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, sites(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
      setLoading(false);
    } catch (err) {
      console.error(`Erro ao carregar perfil (Tentativa ${retryCount + 1}):`, err);
      if (retryCount < 3) {
        // Wait a bit and try again (helps with race conditions during signup)
        setTimeout(() => fetchProfile(id, retryCount + 1), 1500);
      } else {
        setProfile(null);
        setLoading(false);
      }
    }
  };

  if (loading) return (
    <div style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexDirection: 'column', gap: '20px' }}>
      <div className="loader"></div>
      <div style={{ fontSize: '18px', letterSpacing: '2px', fontWeight: 300, color: 'var(--text-primary)' }}>
        {profile === 'fetching' ? 'SINCRONIZANDO PERFIL...' : 'PEDOBRA'}
      </div>
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
            ) : profile.is_active === false ? (
              <div style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexDirection: 'column', gap: '24px', padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ff4444' }}>
                   <Lock size={40} color="#ff4444" />
                </div>
                <div>
                  <h2 style={{ color: '#ff4444', fontWeight: 900, fontSize: '24px', marginBottom: '8px' }}>CONTA INATIVA</h2>
                  <p style={{ maxWidth: '400px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                    Sua conta foi desativada pelo administrador. <br/> 
                    Entre em contato com sua organização para reativar seu acesso.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => supabase.auth.signOut()}>Sair do Sistema</button>
              </div>
            ) : (
              profile.role === 'master' ? <Navigate to="/master" /> :
              profile.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            )
        } />

        <Route path="/master" element={
          session && profile?.role === 'master' && profile?.is_active !== false ? <AdminLayout><MasterDashboard /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/master/financeiro" element={
          session && profile?.role === 'master' && profile?.is_active !== false ? <AdminLayout><MasterFinanceiro /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/master/links" element={
          session && profile?.role === 'master' && profile?.is_active !== false ? <AdminLayout><MasterLinks /></AdminLayout> : <Navigate to="/" />
        } />

        <Route path="/admin/*" element={
          session && profile?.role === 'admin' && profile?.is_active !== false ? (
            <SubscriptionGuard role="admin">
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/novo" element={<UserFormPage />} />
                  <Route path="users/editar/:id" element={<UserFormPage />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/novo" element={<OrderFormPage />} />
                  <Route path="orders/editar/:id" element={<OrderFormPage />} />
                  <Route path="orders/visualizar/:id" element={<OrderViewPage />} />
                  <Route path="sites" element={<AdminObras />} />
                  <Route path="sites/novo" element={<SiteFormPage />} />
                  <Route path="sites/editar/:id" element={<SiteFormPage />} />
                  <Route path="materials" element={<AdminCatalog />} />
                  <Route path="materials/novo" element={<MaterialFormPage />} />
                  <Route path="materials/editar/:id" element={<MaterialFormPage />} />
                  <Route path="suppliers" element={<AdminCatalog />} />
                  <Route path="suppliers/novo" element={<SupplierFormPage />} />
                  <Route path="suppliers/editar/:id" element={<SupplierFormPage />} />
                  <Route path="settings" element={<AdminSettings profile={profile} />} />
                  <Route path="plans" element={<AdminPlans />} />
                  <Route path="audit-logs" element={<AdminAuditLogs />} />
                  <Route path="reports" element={<AdminReports />} />
                </Routes>
              </AdminLayout>
            </SubscriptionGuard>
          ) : <Navigate to="/" />
        } />

        <Route path="/dashboard/*" element={
          session && profile?.role === 'worker' && profile?.is_active !== false ? (
            <SubscriptionGuard role="worker">
              <Routes>
                  <Route path="/" element={<WorkerDashboard profile={profile} />} />
                  <Route path="receipts" element={<WorkerReceiving profile={profile} />} />
                  <Route path="receipts/:id" element={<ReceivingConfirmPage profile={profile} />} />
                  <Route path="pedir" element={<NewOrderPage profile={profile} />} />
                  <Route path="pedido/:id" element={<OrderDetailsPage />} />
              </Routes>
            </SubscriptionGuard>
          ) : <Navigate to="/" />
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
