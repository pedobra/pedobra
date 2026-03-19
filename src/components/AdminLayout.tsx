import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Construction,
    Package,
    Truck,
    Settings,
    LogOut,
    ChevronRight,
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
    const location = useLocation();
    const { isExpired, loading: subLoading } = useSubscription();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
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
        <div className="admin-wrapper">
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

            <aside 
                className={`sidebar-glass ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                onMouseEnter={() => setIsCollapsed(false)}
                onMouseLeave={() => setIsCollapsed(true)}
            >
                <div className="sidebar-brand">
                    <div className="brand-logo">
                        <Construction size={20} color="var(--bg-dark)" />
                    </div>
                    {!isCollapsed && (
                        <div className="brand-text animate-fade-fast">
                            <strong>PedObra</strong>
                            <span>Painel Administrativo</span>
                        </div>
                    )}
                </div>

                <nav className="sidebar-menu">
                    {!isCollapsed && <label className="animate-fade-fast">PLATAFORMA</label>}
                    <NavLink to="/admin" end title={isCollapsed ? "Painel Master" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard size={20} />
                        {!isCollapsed && <span className="animate-fade-fast">Painel Master</span>}
                        {location.pathname === '/admin' && !isCollapsed && <ChevronRight size={14} className="active-indicator" />}
                    </NavLink>

                    {!isCollapsed && <label className="animate-fade-fast">RECURSOS</label>}
                    <NavLink to="/admin/obras" title={isCollapsed ? "Canteiros de Obra" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Construction size={20} /> {!isCollapsed && <span className="animate-fade-fast">Canteiros de Obra</span>}
                    </NavLink>
                    <NavLink to="/admin/orders" title={isCollapsed ? "Pedidos" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <ClipboardList size={20} /> {!isCollapsed && <span className="animate-fade-fast">Pedidos</span>}
                    </NavLink>
                    <NavLink to="/admin/materials" title={isCollapsed ? "Materiais" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Package size={20} /> {!isCollapsed && <span className="animate-fade-fast">Materiais</span>}
                    </NavLink>
                    <NavLink to="/admin/suppliers" title={isCollapsed ? "Parceiros" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Truck size={20} /> {!isCollapsed && <span className="animate-fade-fast">Parceiros</span>}
                    </NavLink>

                    {!isCollapsed && <label className="animate-fade-fast">SISTEMA</label>}
                    <NavLink to="/admin/users" title={isCollapsed ? "Gestão de Equipe" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Users size={20} /> {!isCollapsed && <span className="animate-fade-fast">Gestão de Equipe</span>}
                    </NavLink>
                    <NavLink to="/admin/settings" title={isCollapsed ? "Configurações" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Settings size={20} /> {!isCollapsed && <span className="animate-fade-fast">Configurações</span>}
                    </NavLink>
                    <NavLink to="/admin/audit-logs" title={isCollapsed ? "Controle de Logs" : ""} className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                        <Activity size={20} /> {!isCollapsed && <span className="animate-fade-fast">Controle de Logs</span>}
                    </NavLink>

                    {/* Botão Sair — apenas mobile */}
                    <button
                        className="menu-item menu-item-exit"
                        onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    >
                        <LogOut size={20} />
                        <span>Sair do Painel</span>
                    </button>
                </nav>
            </aside>

            {/* Mobile overlay backdrop */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                />
            )}

            <main className={`admin-main-stage ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
                <TrialBanner />
                <header className="stage-header">
                    {/* Badge de novo pedido — lado esquerdo */}
                    <div className="stage-header-left" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <ThemeToggle />
                        {hasNotification && (
                            <button
                                className="notif-badge"
                                onClick={() => { setHasNotification(false); localStorage.removeItem('pedobra_notif'); }}
                                title="Novo pedido — clique para dispensar"
                            >
                                <span className="notif-dot" />
                                <span className="notif-shimmer" />
                                <span className="notif-label">Novo Pedido</span>
                            </button>
                        )}
                    </div>

                    <div className="header-actions-right">
                        <div className="user-profile">
                            <div className="avatar">
                                <User size={16} color="var(--primary)" />
                            </div>
                            <div className="user-info">
                                <strong>{userName}</strong>
                                <span>Online</span>
                            </div>
                            <button className="logout-icon-btn" onClick={handleLogout} title="Sair do Sistema">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>
                <div className="stage-inner animate-fade">
                    {children}
                </div>
            </main>

            <style>{`
        .admin-wrapper {
          display: flex;
          min-height: 100vh;
          background: var(--bg-dark);
          padding: 16px;
          gap: 16px;
        }
        .sidebar-glass {
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          border: 1px solid var(--border);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          padding: 32px 16px;
          height: calc(100vh - 32px);
          position: sticky;
          top: 16px;
          transition: width var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
        }

        .sidebar-glass.collapsed {
          width: var(--sidebar-collapsed-width);
          padding: 32px 12px;
        }

        .sidebar-brand {
          display: flex; align-items: center; gap: 12px; margin-bottom: 48px; padding: 0 12px;
          min-height: 40px;
        }
        .brand-logo {
          background: var(--primary); padding: 8px; border-radius: 12px;
          flex-shrink: 0;
        }
        .brand-text { display: flex; flex-direction: column; white-space: nowrap; }
        .brand-text strong { font-size: 18px; letter-spacing: -0.5px; }
        .brand-text span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

        .sidebar-menu {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 8px;
        }
        .sidebar-menu::-webkit-scrollbar { width: 4px; }
        .sidebar-menu::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .sidebar-menu label {
          display: block; font-size: 10px; font-weight: 800; color: var(--text-muted); padding: 0 16px;
          margin-bottom: 12px; margin-top: 24px; letter-spacing: 2px;
        }
        .menu-item {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          color: var(--text-secondary); text-decoration: none; border-radius: 16px;
          transition: 0.3s; font-size: 14px; font-weight: 500; margin-bottom: 4px;
          white-space: nowrap;
        }
        .menu-item:hover { background: var(--bg-dark); color: var(--primary); }
        .menu-item.active { background: var(--bg-dark); color: var(--primary); border: 1px solid var(--border); }
        .active-indicator { margin-left: auto; }
        /* Esconde o botão Sair no desktop */
        .menu-item-exit { display: none; }

        /* ── Notification Badge (green glow) ── */
        .stage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.01);
        }
        .stage-header-left { display: flex; align-items: center; min-width: 200px; }

        .notif-badge {
          display: flex; align-items: center; gap: 10px;
          background: rgba(52,199,89,0.08);
          border: 1px solid rgba(52,199,89,0.35);
          border-radius: 100px;
          padding: 8px 18px 8px 14px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          animation: badge-entry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          transition: background 0.2s;
        }
        .notif-badge:hover { background: rgba(52,199,89,0.14); }

        .notif-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: #34C759;
          box-shadow: 0 0 0 0 rgba(52,199,89,0.7);
          animation: pulse-green 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }

        .notif-shimmer {
          position: absolute; top: 0; left: -60%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(52,199,89,0.25), transparent);
          animation: shimmer 2.4s ease-in-out infinite;
        }

        .notif-label {
          font-size: 12px; font-weight: 700;
          color: #34C759; letter-spacing: 0.3px;
          white-space: nowrap;
        }

        /* Badge mobile (inside admin-mobile-header) */
        .notif-badge-mobile {
          display: flex; align-items: center; gap: 8px;
          background: rgba(52,199,89,0.1);
          border: 1px solid rgba(52,199,89,0.4);
          border-radius: 100px;
          padding: 6px 14px 6px 10px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          animation: badge-entry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .notif-badge-mobile .notif-dot {
          width: 10px; height: 10px;
          animation: pulse-green 1.8s ease-in-out infinite;
        }
        .notif-badge-mobile .notif-label {
          font-size: 11px; font-weight: 700; color: #34C759;
        }

        @keyframes pulse-green {
          0%   { box-shadow: 0 0 0 0 rgba(52,199,89,0.7); }
          50%  { box-shadow: 0 0 0 8px rgba(52,199,89,0); background: #4ade80; }
          100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
        }
        @keyframes shimmer {
          0%   { left: -60%; }
          60%  { left: 130%; }
          100% { left: 130%; }
        }
        @keyframes badge-entry {
          from { opacity: 0; transform: scale(0.7) translateX(-10px); }
          to   { opacity: 1; transform: scale(1) translateX(0); }
        }
        .user-profile {
          display: flex; align-items: center; gap: 12px; padding: 6px 16px;
          background: rgba(255,255,255,0.03); border-radius: 12px;
          border: 1px solid var(--border);
        }
        .avatar { width: 32px; height: 32px; background: var(--primary-glow); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .user-info { display: flex; flex-direction: column; }
        .user-info strong { font-size: 13px; color: var(--text-primary); }
        .user-info span { font-size: 10px; color: var(--status-approved); }
        .logout-icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: 0.3s; margin-left: 8px;}
        .logout-icon-btn:hover { color: var(--status-denied); }

        .admin-main-stage {
          flex: 1;
          background: var(--bg-sidebar);
          border: 1px solid var(--border);
          border-radius: 24px;
          overflow: hidden;
          height: calc(100vh - 32px);
          position: relative;
          display: flex;
          flex-direction: column;
          transition: margin var(--transition-speed) ease;
        }
        .stage-inner {
           flex: 1;
           overflow-y: auto;
           padding: 40px;
        }
        
        .animate-fade-fast {
          animation: fadeIn 0.15s ease-out forwards;
        }
        /* Admin Mobile Support */
        .admin-mobile-header { display: none; }
        
        @media (max-width: 1024px) {
           .admin-wrapper { flex-direction: column; padding: 0; }
           .admin-mobile-header { 
              display: flex; align-items: center; justify-content: space-between; 
              padding: 16px 24px; background: var(--bg-sidebar); border-bottom: 1px solid var(--border);
              position: sticky; top: 0; z-index: 1000;
           }
           .brand-small { display: flex; align-items: center; gap: 8px; }
           .menu-toggle { background: transparent; border: none; color: var(--text-primary); cursor: pointer; }
           
           .sidebar-glass { 
              position: fixed; top: 72px; left: 0; right: 0; bottom: 0; 
              width: 100%; height: auto; z-index: 999; border-radius: 0;
              transform: translateX(-100%); transition: 0.4s ease;
              display: flex !important;
              overflow-y: auto;
           }
           .sidebar-glass.mobile-open { transform: translateX(0); }
           
           /* Botão sair — só aparece no mobile */
           .menu-item-exit {
               display: flex;
               width: 100%;
               border: none;
               background: rgba(255, 59, 48, 0.08);
               color: #ff3b30;
               margin-top: 16px;
               border-top: 1px solid rgba(255,59,48,0.15);
               padding-top: 20px;
               cursor: pointer;
           }
           .menu-item-exit:hover { background: rgba(255,59,48,0.15); color: #ff6b63; }
           
           .admin-main-stage { border-radius: 0; border: none; height: auto; min-height: calc(100vh - 72px); }
           .stage-inner { padding: 20px 14px; height: auto; overflow-y: visible; }
           .stage-header { display: none; }
        }
      `}</style>
        </div>
    );
};

export default AdminLayout;
