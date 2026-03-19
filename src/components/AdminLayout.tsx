import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    Users,
    Construction,
    Package,
    Truck,
    Settings,
    LogOut,
    ChevronLeft,
    User,
    ClipboardList,
    Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Menu, X, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { TrialBanner } from './TrialBanner';
import { useSubscription } from '../hooks/useSubscription';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    // location not used but hook kept for future URL-based active states if needed

    const { isExpired, loading: subLoading } = useSubscription();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // Default to expanded for better first impression
    const [userName, setUserName] = useState('Admin Master');
    // Inicializa do localStorage para sobreviver ao refresh
    const [hasNotification, setHasNotification] = useState(
        () => localStorage.getItem('pedobra_notif') === 'true'
    );

    // lastCheckRef também persistido — evita re-detectar pedidos antigos após refresh
    const lastCheckRef = useRef<string>(
        localStorage.getItem('pedobra_last_check') || new Date().toISOString()
    );

    const triggerNotification = () => {
        setHasNotification(true);
        localStorage.setItem('pedobra_notif', 'true'); // persiste o badge
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📦 Novo Pedido — PedObra', {
                body: 'Um novo pedido foi criado e aguarda aprovação.',
                icon: '/favicon.ico',
            });
        }
    };

    useEffect(() => {
        fetchProfile();

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkOrders = async () => {
            const since = lastCheckRef.current;
            // Avança o baseline com buffer de 2s para diferença de relógio servidor/cliente
            const nextSince = new Date(Date.now() - 2000).toISOString();

            const { data, error } = await supabase
                .from('orders')
                .select('id')
                .gt('created_at', since);

            if (!error) {
                // persiste o timestamp para sobreviver ao refresh
                localStorage.setItem('pedobra_last_check', nextSince);
                lastCheckRef.current = nextSince;
                const newCount = data?.length ?? 0;
                if (newCount > 0) {
                    triggerNotification();
                }
            }
        };

        // 1. Verificação imediata ao abrir o painel
        checkOrders();

        // 2. Polling a cada 10 segundos
        const poll = setInterval(checkOrders, 10000);

        // 3. Verifica imediatamente ao voltar para a aba (resolve throttling de background)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkOrders();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // 4. Realtime como fast-path
        const channel = supabase
            .channel('admin-new-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                triggerNotification();
                lastCheckRef.current = new Date().toISOString();
            })
            .subscribe();

        return () => {
            clearInterval(poll);
            document.removeEventListener('visibilitychange', handleVisibility);
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', user.id)
                .single();
            if (data?.name) setUserName(data.name);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (subLoading) return null; // Prevents flash of content

    if (isExpired) {
        return (
            <div className="expired-overlay glass">
                <div className="expired-card premium-card animate-fade">
                    <div className="expired-icon">
                        <ShieldAlert size={48} color="#ef4444" />
                    </div>
                    <h2>Seu período de teste expirou</h2>
                    <p>Para continuar gerenciando suas obras e acessando seus dados, por favor selecione um plano de assinatura.</p>
                    <div className="expired-actions">
                        <button className="btn-primary" onClick={() => window.location.href = '/admin/billing'}>
                            Ver Planos de Assinatura
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>
                            Sair do Sistema
                        </button>
                    </div>
                </div>
                <style>{`
                    .expired-overlay {
                        position: fixed; inset: 0; z-index: 9999;
                        display: flex; align-items: center; justify-content: center;
                        background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
                    }
                    .expired-card {
                        max-width: 450px; width: 90%; text-align: center; padding: 40px;
                        background: var(--bg-sidebar); border: 1px solid var(--border);
                        border-radius: 32px;
                    }
                    .expired-icon { margin-bottom: 24px; }
                    .expired-card h2 { margin-bottom: 16px; color: var(--text-primary); }
                    .expired-card p { margin-bottom: 32px; color: var(--text-muted); line-height: 1.6; }
                    .expired-actions { display: flex; flex-direction: column; gap: 12px; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="admin-wrapper" data-theme="light">
            <header className="admin-mobile-header">
                <div className="brand-small">
                    <Construction size={18} color="var(--primary)" />
                    <strong>PedObra</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ThemeToggle />
                    {hasNotification && (
                        <button
                            className="notif-badge-mobile"
                            onClick={() => { setHasNotification(false); localStorage.removeItem('pedobra_notif'); }}
                            title="Novo pedido — toque para dispensar"
                        >
                            <span className="notif-dot" />
                            <span className="notif-label">Novo Pedido</span>
                        </button>
                    )}
                    <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            <aside className={`sidebar-glass ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-logo">
                        <Construction size={20} color="#FFF" />
                    </div>
                    {!isCollapsed && (
                        <div className="brand-text animate-fade-fast">
                            <strong>PedObra</strong>
                            <span>Admin</span>
                        </div>
                    )}
                    <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                        <ChevronLeft size={16} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
                    </button>
                </div>

                <nav className="sidebar-menu">
                    {!isCollapsed && <label>PRINCIPAL</label>}
                    <NavLink to="/admin" end className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard size={20} /> {!isCollapsed && <span>Dashboard</span>}
                    </NavLink>

                    {!isCollapsed && <label>RECURSOS</label>}
                    <NavLink to="/admin/sites" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Construction size={20} /> {!isCollapsed && <span>Canteiros</span>}
                    </NavLink>
                    <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <ClipboardList size={20} /> {!isCollapsed && <span>Pedidos</span>}
                    </NavLink>
                    <NavLink to="/admin/materials" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Package size={20} /> {!isCollapsed && <span>Materiais</span>}
                    </NavLink>
                    <NavLink to="/admin/suppliers" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Truck size={20} /> {!isCollapsed && <span>Parceiros</span>}
                    </NavLink>

                    {!isCollapsed && <label>SISTEMA</label>}
                    <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Users size={20} /> {!isCollapsed && <span>Equipe</span>}
                    </NavLink>
                    <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Settings size={20} /> {!isCollapsed && <span>Configurações</span>}
                    </NavLink>
                    <NavLink to="/admin/audit-logs" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Activity size={20} /> {!isCollapsed && <span>Logs</span>}
                    </NavLink>
                </nav>
            </aside>

            <main className="admin-main-content">
                <TrialBanner />
                <header className="admin-header">
                    <div className="header-left">
                        <ThemeToggle />
                        {hasNotification && (
                            <div className="header-notif">Novo Pedido disponível</div>
                        )}
                    </div>
                    <div className="header-right">
                        <div className="user-pill">
                            <div className="user-avatar"><User size={14} /></div>
                            <div className="user-name">{userName}</div>
                            <button className="btn-logout" onClick={handleLogout}><LogOut size={14} /></button>
                        </div>
                    </div>
                </header>
                <div className="admin-page-content">
                    {children}
                </div>
            </main>

            <style>{`
                .admin-wrapper { display: flex; min-height: 100vh; background: var(--bg-dark); }
                
                .sidebar-glass { 
                    width: var(--sidebar-width); background: #FFF; border-right: 1px solid var(--border);
                    display: flex; flex-direction: column; padding: 24px 16px; transition: 0.2s;
                }
                .sidebar-glass.collapsed { width: var(--sidebar-collapsed-width); }

                .sidebar-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; position: relative; }
                .brand-logo { width: 32px; height: 32px; background: #0F172A; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #FFF; }
                .brand-text strong { display: block; font-size: 16px; font-weight: 700; }
                .brand-text span { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
                .sidebar-toggle-btn { position: absolute; right: -28px; top: 4px; background: #FFF; border: 1px solid var(--border); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); }

                .sidebar-menu label { font-size: 10px; font-weight: 700; color: var(--text-muted); margin: 24px 12px 8px; text-transform: uppercase; }
                .menu-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 500; }
                .menu-item:hover { background: #F9FAFB; color: var(--text-primary); }
                .menu-item.active { background: #F3F4F6; color: var(--text-primary); font-weight: 600; }

                .admin-main-content { flex: 1; display: flex; flex-direction: column; }
                .admin-header { height: 64px; background: #FFF; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
                
                .user-pill { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 100px; }
                .user-avatar { width: 24px; height: 24px; background: #F3F4F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
                .user-name { font-size: 13px; font-weight: 600; }
                .btn-logout { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
                .btn-logout:hover { color: #EF4444; }

                .admin-page-content { flex: 1; padding: 40px 48px; max-width: 1600px; width: 100%; margin: 0 auto; }
                
                @media (max-width: 1024px) {
                    .admin-wrapper { flex-direction: column; }
                    .admin-mobile-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: #FFF; border-bottom: 1px solid var(--border); height: 64px; }
                    .sidebar-glass { position: fixed; top: 64px; left: 0; right: 0; bottom: 0; width: 100%; z-index: 1000; transform: translateX(-100%); transition: 0.3s; }
                    .sidebar-glass.mobile-open { transform: translateX(0); }
                    .admin-header { display: none; }
                    .admin-page-content { padding: 24px 16px; }
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;
