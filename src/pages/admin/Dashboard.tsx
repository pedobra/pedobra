import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Clock, PackageCheck, Search, Building2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [ordersRes, sitesRes] = await Promise.all([
                    supabase.from('orders').select('*, sites(name), profiles(name)').order('created_at', { ascending: false }),
                    supabase.from('sites').select('*').order('name')
                ]);

                if (ordersRes.error) throw ordersRes.error;
                if (sitesRes.error) throw sitesRes.error;

                setOrders(ordersRes.data || []);
                setSites(sitesRes.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => 
            (o.sites?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.id || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orders, searchTerm]);

    const stats = useMemo(() => {
        const active = orders.filter(o => o.status === 'pending' || o.status === 'approved').length;
        const totalValue = orders.reduce((acc, o) => acc + (o.total_value || 0), 0);
        return { active, totalValue, sitesCount: sites.length };
    }, [orders, sites]);

    const columns = [
        { 
            header: 'ID', 
            accessor: (o: any) => <span className="text-mono">#{o.id.slice(0,8)}</span> 
        },
        { header: 'Canteiro', accessor: (o: any) => <strong>{o.sites?.name}</strong> },
        { header: 'Solicitante', accessor: (o: any) => o.profiles?.name || 'Sistema' },
        { header: 'Status', accessor: (o: any) => <StatusBadge status={o.status} /> },
        { header: 'Data', accessor: (o: any) => new Date(o.created_at).toLocaleDateString() },
        {
            header: 'Ações',
            accessor: (o: any) => (
                <button className="icon-btn" onClick={() => navigate(`/admin/pedidos/visualizar/${o.id}`)}>
                    <Eye size={16} />
                </button>
            )
        }
    ];

    return (
        <div className="dashboard-container animate-fade">
            <header className="dashboard-header">
                <div className="header-info">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Visão geral das operações em seus canteiros.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Buscar pedido ou obra..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="stats-layout">
                <div className="stat-card-premium">
                    <div className="stat-icon-bg"><PackageCheck size={24} color="var(--primary)" /></div>
                    <div className="stat-data">
                        <label>Pedidos Ativos</label>
                        <strong>{stats.active}</strong>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon-bg"><TrendingUp size={24} color="#10b981" /></div>
                    <div className="stat-data">
                        <label>Total Gasto (Mês)</label>
                        <strong>R$ {stats.totalValue.toLocaleString()}</strong>
                    </div>
                </div>
                <div className="stat-card-premium">
                    <div className="stat-icon-bg"><Building2 size={24} color="#3b82f6" /></div>
                    <div className="stat-data">
                        <label>Canteiros</label>
                        <strong>{stats.sitesCount}</strong>
                    </div>
                </div>
            </div>

            <StandardCard
                title="Últimos Pedidos"
                subtitle="Acompanhe o fluxo de suprimentos em tempo real."
                icon={<Clock size={20} color="var(--primary)" />}
            >
                <ModernTable columns={columns} data={filteredOrders.slice(0, 10)} loading={loading} />
            </StandardCard>

            <style>{`
                .dashboard-container { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 850; margin-bottom: 4px; letter-spacing: -0.5px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 12px; }
                .search-bar-glass { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 0 16px; display: flex; align-items: center; gap: 10px; width: 260px; height: 44px; }
                .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 13px; }
                
                .stats-layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .stat-card-premium { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; display: flex; align-items: center; gap: 20px; }
                .stat-icon-bg { width: 56px; height: 56px; border-radius: 16px; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; }
                .stat-data { display: flex; flex-direction: column; gap: 4px; }
                .stat-data label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
                .stat-data strong { font-size: 24px; font-weight: 850; color: var(--text-primary); }

                @media (max-width: 768px) {
                    .stats-layout { grid-template-columns: 1fr; }
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .search-bar-glass { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
