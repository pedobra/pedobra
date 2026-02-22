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
import AdminAuditLogs from './pages/admin/AuditLogs';
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerReceiving from './pages/worker/Receiving';

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
        <Route path="/admin/obras" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminObras /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/orders" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminOrders /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/materials" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminCatalog /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/suppliers" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminCatalog /></AdminLayout> : <Navigate to="/" />
        } />
        <Route path="/admin/settings" element={
          session && profile?.role === 'admin' ? <AdminLayout><AdminSettings /></AdminLayout> : <Navigate to="/" />
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
