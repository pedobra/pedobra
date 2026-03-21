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
    ChevronLeft,
    User,
    ClipboardList,
    Activity,
    Menu,
    X,
    ShieldAlert,
    Crown,
    PieChart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import { TrialBanner } from './TrialBanner';
import { useSubscription } from '../hooks/useSubscription';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { planId, isExpired, loading: subLoading, systemMessage, systemMessageLevel } = useSubscription();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userName, setUserName] = useState('Admin Master');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [hasNotification, setHasNotification] = useState(
        () => localStorage.getItem('pedobra_notif') === 'true'
    );
    const [isMessageDismissed, setIsMessageDismissed] = useState(false);

    useEffect(() => {
        if (systemMessage) {
            const savedDismissed = localStorage.getItem('pedobra_sys_msg_dismissed');
            if (savedDismissed === systemMessage) {
                setIsMessageDismissed(true);
            } else {
                setIsMessageDismissed(false);
            }
        }
    }, [systemMessage]);

    const lastCheckRef = useRef<string>(
        localStorage.getItem('pedobra_last_check') || new Date().toISOString()
    );

    const triggerNotification = () => {
        setHasNotification(true);
        localStorage.setItem('pedobra_notif', 'true');
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
            const nextSince = new Date(Date.now() - 2000).toISOString();

            const { data, error } = await supabase
                .from('orders')
                .select('id')
                .gt('created_at', since);

            if (!error) {
                localStorage.setItem('pedobra_last_check', nextSince);
                lastCheckRef.current = nextSince;
                if (data && data.length > 0) {
                    triggerNotification();
                }
            }
        };

        checkOrders();
        const poll = setInterval(checkOrders, 30000); // 30s is enough for polling

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkOrders();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

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
                .select('name, role')
                .eq('id', user.id)
                .single();
            if (data?.name) setUserName(data.name);
            if (data?.role) setUserRole(data.role);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (subLoading) return null;

    if (isExpired && location.pathname !== '/admin/plans') {
        return (
            <div className="expired-overlay">
                <div className="expired-card premium-card animate-fade">
                    <div className="expired-icon">
                        <ShieldAlert size={48} color="var(--status-denied)" />
                    </div>
                    <h2>Seu período de acesso expirou</h2>
                    <p>Para continuar gerenciando suas obras e acessando seus dados, por favor selecione um plano de assinatura.</p>
                    <div className="expired-actions">
                        <button className="btn-primary" onClick={() => navigate('/admin/plans')}>
                            Ver Planos de Assinatura
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>
                            Sair do Sistema
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-wrapper">
            <header className="admin-mobile-header">
                <div className="brand-small">
                    <img 
                        src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" 
                        alt="PedObra Logo" 
                        style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ThemeToggle />
                    {hasNotification && (
                        <button
                            className="notif-badge-mobile"
                            onClick={() => { setHasNotification(false); localStorage.removeItem('pedobra_notif'); }}
                            style={{ background: 'var(--status-pending)', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', color: 'var(--primary-foreground)' }}
                        >
                            Novo Pedido
                        </button>
                    )}
                    <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        {mobileMenuOpen ? <X size={24} color="var(--text-primary)" /> : <Menu size={24} color="var(--text-primary)" />}
                    </button>
                </div>
            </header>
            
            {mobileMenuOpen && (
                <div 
                    className="mobile-sidebar-overlay" 
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999,
                        animation: 'fadeIn 0.3s ease'
                    }}
                />
            )}

            <aside className={`sidebar-glass ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-logo-img-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                            src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" 
                            alt="PedObra Logo" 
                            style={{ height: isCollapsed ? '28px' : '40px', width: 'auto', objectFit: 'contain', transition: 'height 0.2s' }}
                        />
                    </div>
                    <div className="sidebar-brand-actions">
                        {/* Botão de fechar visível apenas no mobile */}
                        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
                            <X size={24} />
                        </button>
                        
                        {!mobileMenuOpen && (
                            <>
                                <ThemeToggle />
                                <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                                    <ChevronLeft size={16} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <nav className="sidebar-menu">
                    {!isCollapsed && <label>PRINCIPAL</label>}
                    {userRole === 'master' ? (
                        <>
                            <NavLink to="/master" end className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <LayoutDashboard size={20} /> {!isCollapsed && <span>Master Dashboard</span>}
                            </NavLink>
                            <NavLink to="/master/financeiro" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <PieChart size={20} /> {!isCollapsed && <span>Financeiro</span>}
                            </NavLink>
                        </>
                    ) : (
                        <NavLink to="/admin" end className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                            <LayoutDashboard size={20} /> {!isCollapsed && <span>Dashboard</span>}
                        </NavLink>
                    )}

                    {userRole !== 'master' && (
                        <>
                            {!isCollapsed && <label>RECURSOS</label>}
                            <NavLink to="/admin/sites" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Construction size={20} /> {!isCollapsed && <span>Obras</span>}
                            </NavLink>
                            <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <ClipboardList size={20} /> {!isCollapsed && <span>Pedidos</span>}
                            </NavLink>
                            <NavLink to="/admin/materials" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Package size={20} /> {!isCollapsed && <span>Materiais</span>}
                            </NavLink>
                            <NavLink to="/admin/suppliers" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Truck size={20} /> {!isCollapsed && <span>Fornecedores</span>}
                            </NavLink>
                            {planId !== 'basic' && (
                                <NavLink to="/admin/reports" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                    <PieChart size={20} /> {!isCollapsed && <span>Relatórios</span>}
                                </NavLink>
                            )}
                        </>
                    )}

                    {userRole !== 'master' && (
                        <>
                            {!isCollapsed && <label>SISTEMA</label>}
                            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Users size={20} /> {!isCollapsed && <span>Usuários</span>}
                            </NavLink>
                            <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Settings size={20} /> {!isCollapsed && <span>Configurações</span>}
                            </NavLink>
                            <NavLink to="/admin/plans" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Crown size={20} /> {!isCollapsed && <span>Planos</span>}
                            </NavLink>
                            <NavLink to="/admin/audit-logs" className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} onClick={() => setMobileMenuOpen(false)}>
                                <Activity size={20} /> {!isCollapsed && <span>Logs</span>}
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* Botão de Sair fixo no rodapé apenas para Mobile */}
                <div className="sidebar-footer-mobile">
                    <button className="menu-item logout-mobile" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Sair do Sistema</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main-content">
                {systemMessage && !isMessageDismissed && (
                    <div className={`system-banner ${systemMessageLevel}`} style={{ 
                        padding: '12px 24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        background: systemMessageLevel === 'error' ? 'rgba(239,68,68,0.1)' : systemMessageLevel === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                        borderBottom: '1.5px solid var(--border)',
                        color: systemMessageLevel === 'error' ? '#ef4444' : systemMessageLevel === 'warning' ? '#f59e0b' : '#3b82f6',
                        fontSize: '13px',
                        fontWeight: 600,
                        animation: 'slideDown 0.3s ease-out',
                        position: 'relative'
                    }}>
                        <ShieldAlert size={18} />
                        <span style={{ flex: 1 }}>{systemMessage}</span>
                        <button 
                            onClick={() => {
                                setIsMessageDismissed(true);
                                localStorage.setItem('pedobra_sys_msg_dismissed', systemMessage);
                            }}
                            className="icon-btn-ghost"
                            style={{ padding: '4px', height: 'auto', background: 'transparent' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <TrialBanner />
                <header className="admin-header">
                    <div className="header-left">
                        {hasNotification && (
                            <div 
                                className="notif-badge-modern" 
                                onClick={() => { setHasNotification(false); localStorage.removeItem('pedobra_notif'); }}
                                title="Clique para remover"
                            >
                                <div className="dot-container">
                                    <span className="dot-core" />
                                    <span className="dot-pulse" />
                                </div>
                                <span className="notif-text">NOVO PEDIDO</span>
                            </div>
                        )}
                    </div>
                    <div className="header-right">
                        <div className="user-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '100px' }}>
                            <div className="user-avatar" style={{ width: '24px', height: '24px', background: 'var(--bg-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14} /></div>
                            <div className="user-name" style={{ fontSize: '13px', fontWeight: '600' }}>{userName}</div>
                            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><LogOut size={14} /></button>
                        </div>
                    </div>
                </header>
                <div className="admin-page-content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
