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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, sites(name), profiles(name)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setOrders(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
            accessor: (o: any) => <span className="text-mono">#{o.id?.slice(0,8)}</span> 
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

            <div className="stats-layout">
                {statCards.map(card => (
                    <div 
                        key={String(card.key)} 
                        className={`stat-card-saas ${statusFilter === card.key ? 'active-filter' : ''}`}
                        onClick={() => setStatusFilter(statusFilter === card.key ? null : card.key)}
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

            <StandardCard
                title="Movimentações Recentes"
                subtitle="Acompanhe e gerencie as últimas solicitações do sistema."
            >
                <ModernTable columns={columns} data={filteredOrders.slice(0, 10)} loading={loading} />
            </StandardCard>

            <style>{`
                .dashboard-container { display: flex; flex-direction: column; gap: 32px; }
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
