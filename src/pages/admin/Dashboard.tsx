import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, PackageCheck, Search, Eye, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [onboardingStats, setOnboardingStats] = useState({ sites: 0, materials: 0, team: 0, orders: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get user profile first to get organization_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (!profile) return;

            const orgId = profile.organization_id;

            // Fetch everything in parallel
            const [ordersRes, sitesRes, materialsRes, teamRes] = await Promise.all([
                supabase.from('orders').select('*, sites(name), profiles(name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
                supabase.from('sites').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
                supabase.from('materials').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
            ]);

            setOrders(ordersRes.data || []);
            setOnboardingStats({
                orders: ordersRes.data?.length || 0,
                sites: sitesRes.count || 0,
                materials: materialsRes.count || 0,
                team: teamRes.count || 0
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    useEffect(() => {
        const handleNewOrder = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('pedobra_new_order', handleNewOrder);
        return () => window.removeEventListener('pedobra_new_order', handleNewOrder);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = (o.sites?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (o.id || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter ? 
                (statusFilter === 'new' ? (o.status === 'new' || o.status === 'pending') : o.status === statusFilter) 
                : true;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        return orders.reduce((acc, curr: any) => {
            acc.total++;
            const st = curr.status as string;
            if (st === 'new' || st === 'pending') acc.new++;
            else if (st === 'approved') acc.approved++;
            else if (st === 'denied') acc.denied++;
            else if (st === 'partial') acc.partial++;
            else if (st === 'completed') acc.completed++;
            return acc;
        }, { total: 0, new: 0, approved: 0, denied: 0, partial: 0, completed: 0 });
    }, [orders]);

    const getOrderRef = (o: any) => {
        if (!o || !o.created_at) return 'N/A';
        const d = new Date(o.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(o.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    const statCards = [
        { key: null, label: 'Fluxo Total', value: stats.total, icon: <TrendingUp size={20} color="var(--primary)" /> },
        { key: 'new', label: 'Pendentes', value: stats.new, icon: <Clock size={20} color="var(--status-pending)" /> },
        { key: 'approved', label: 'Aprovados', value: stats.approved, icon: <CheckCircle size={20} color="var(--status-approved)" /> },
        { key: 'partial', label: 'Rec. Parcial', value: stats.partial, icon: <AlertTriangle size={20} color="var(--status-partial)" /> },
        { key: 'completed', label: 'Concluídos', value: stats.completed, icon: <PackageCheck size={20} color="var(--status-approved)" /> },
        { key: 'denied', label: 'Negados', value: stats.denied, icon: <XCircle size={20} color="var(--status-denied)" /> },
    ];

    const columns = [
        { 
            header: 'ID', 
            accessor: (o: any) => <span className="text-mono">{getOrderRef(o)}</span> 
        },
        { header: 'Obra', accessor: (o: any) => <strong>{o.sites?.name}</strong> },
        { header: 'Solicitante', accessor: (o: any) => o.profiles?.name || 'Sistema' },
        { header: 'Status', accessor: (o: any) => <StatusBadge status={o.status} /> },
        { header: 'Data', accessor: (o: any) => new Date(o.created_at).toLocaleDateString() },
        {
            header: 'Ações',
            accessor: (o: any) => (
                <button className="icon-btn" onClick={() => navigate(`/admin/orders/visualizar/${o.id}`)}>
                    <Eye size={16} />
                </button>
            )
        }
    ];

    const onboardingItems = [
        { label: 'Cadastrar primeira Obra', completed: onboardingStats.sites > 0, link: '/admin/sites/novo' },
        { label: 'Alimentar Catálogo', completed: onboardingStats.materials > 0, link: '/admin/materials' },
        { label: 'Convidar Equipe', completed: onboardingStats.team > 1, link: '/admin/users/novo' },
        { label: 'Realizar Pedido de Teste', completed: onboardingStats.orders > 0, link: '/admin/orders' }
    ];

    const progressValue = Math.round((onboardingItems.filter(i => i.completed).length / onboardingItems.length) * 100);

    return (
        <div className="dashboard-container animate-fade">
            <header className="dashboard-header">
                <div className="header-info">
                    <h1 className="page-title">Painel Estratégico</h1>
                    <p className="page-subtitle">Visão panorâmica de todas as operações em tempo real.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas">
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Buscar pedidos..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/orders/novo')}>
                        Novo Pedido
                    </button>
                </div>
            </header>
 
            {progressValue < 100 && (
                <div className="onboarding-card glass-premium animate-fade-in">
                    <div className="onboarding-header">
                        <div className="onboarding-title-group">
                            <h3 className="onboarding-title">🎯 Seus Primeiros Passos</h3>
                            <p className="onboarding-subtitle">Complete estas tarefas para dominar o PedObra.</p>
                        </div>
                        <div className="onboarding-progress-container">
                            <div className="progress-text">{progressValue}% Concluído</div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${progressValue}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="onboarding-grid">
                        {onboardingItems.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`onboarding-item ${item.completed ? 'completed' : ''}`}
                                onClick={() => !item.completed && navigate(item.link)}
                            >
                                <div className="check-orb">
                                    {item.completed ? <CheckCircle size={14} /> : <div className="dot" />}
                                </div>
                                <span className="item-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
 
            <div className="stats-layout">
                {statCards.map(card => (
                    <div 
                        key={String(card.key)} 
                        className={`stat-card-saas ${statusFilter === card.key ? 'active-filter' : ''}`}
                        onClick={() => {
                            setStatusFilter(statusFilter === card.key ? null : card.key);
                            if (window.innerWidth <= 1024) {
                                document.getElementById('orders-table-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                        style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '12px' }}
                    >
                        <div className="stat-icon-bg" style={{ width: 34, height: 34 }}>{card.icon}</div>
                        <div className="stat-data">
                            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</label>
                            <strong>{card.value}</strong>
                        </div>
                    </div>
                ))}
            </div>

            <div id="orders-table-view" style={{ scrollMarginTop: '80px' }}>
                <StandardCard
                    title="Movimentações Recentes"
                    subtitle="Acompanhe e gerencie as últimas solicitações do sistema."
                >
                    <ModernTable 
                        columns={columns} 
                        data={filteredOrders.slice(0, 10)} 
                        loading={loading} 
                        onRowClick={(o) => navigate(`/admin/orders/visualizar/${o.id}`)}
                    />
                </StandardCard>
            </div>

            <style>{`
                .dashboard-container { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

                /* Onboarding Card */
                .onboarding-card { 
                    padding: 24px; border: 1px solid var(--primary); 
                    border-radius: 16px; margin-bottom: 8px;
                    display: flex; flex-direction: column; gap: 24px;
                    background: rgba(var(--primary-rgb), 0.02);
                }
                .onboarding-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
                .onboarding-title { font-size: 18px; font-weight: 800; margin: 0; }
                .onboarding-subtitle { font-size: 13px; color: var(--text-muted); margin: 4px 0 0 0; }
                
                .onboarding-progress-container { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 150px; }
                .progress-text { font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; }
                .progress-bar-bg { width: 100%; height: 6px; background: var(--bg-dark); border-radius: 100px; overflow: hidden; border: 1px solid var(--border); }
                .progress-bar-fill { height: 100%; background: var(--primary); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                
                .onboarding-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
                .onboarding-item { 
                    background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; 
                    padding: 16px; display: flex; align-items: center; gap: 12px; cursor: pointer;
                    transition: 0.2s;
                }
                .onboarding-item:hover:not(.completed) { border-color: var(--primary); transform: translateY(-2px); }
                .onboarding-item.completed { opacity: 0.7; cursor: default; background: rgba(255, 255, 255, 0.02); border-color: var(--border); }
                
                .check-orb { 
                    width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border); 
                    display: flex; align-items: center; justify-content: center; color: var(--primary);
                    flex-shrink: 0;
                }
                .completed .check-orb { background: var(--primary); color: var(--bg-dark); border-color: var(--primary); }
                .dot { width: 4px; height: 4px; background: var(--text-muted); border-radius: 50%; }
                .item-label { font-size: 13px; font-weight: 600; }
                .completed .item-label { text-decoration: line-through; color: var(--text-muted); }
                
                @media (max-width: 1024px) {
                    .onboarding-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 640px) {
                    .onboarding-header { flex-direction: column; align-items: stretch; }
                    .onboarding-progress-container { align-items: flex-start; }
                    .onboarding-grid { grid-template-columns: 1fr; }
                }

                .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                
                .header-actions { display: flex; align-items: center; gap: 12px; }
                .search-bar-saas { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 8px; 
                    padding: 0 12px; display: flex; align-items: center; gap: 8px; 
                    width: 240px; height: 44px; transition: border-color 0.2s;
                }
                .search-bar-saas:focus-within { border-color: var(--text-muted); }
                .search-bar-saas input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }
                
                .stats-layout { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
                .stat-card-saas { 
                    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; 
                    padding: 20px; display: flex; align-items: center; gap: 16px;
                    box-shadow: var(--shadow-sm); position: relative; transition: 0.2s;
                }
                .stat-card-saas:hover { border-color: var(--border-bright); transform: translateY(-2px); }
                .stat-card-saas.active-filter { box-shadow: 0 0 0 2px var(--primary); border-color: var(--primary); }
                
                .stat-icon-bg { 
                    width: 40px; height: 40px; border-radius: 10px; background: var(--bg-dark); 
                    display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);
                }
                .stat-data { display: flex; flex-direction: column; gap: 2px; }
                .stat-data label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
                .stat-data strong { font-size: 24px; font-weight: 700; color: var(--text-primary); }

                .text-mono { font-family: var(--font-main); font-size: 13px; color: var(--text-muted); }
                
                @media (max-width: 1200px) {
                    .stats-layout { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 1024px) {
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 20px; }
                    .header-actions { width: 100%; }
                    .search-bar-saas { flex: 1; }
                }
                @media (max-width: 768px) {
                    .stats-layout { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
