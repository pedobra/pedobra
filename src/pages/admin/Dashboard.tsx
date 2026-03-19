import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, PackageCheck, Search, Building2, Eye } from 'lucide-react';
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
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, here's what's happening today.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas">
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/orders/novo')}>
                        New order
                    </button>
                </div>
            </header>

            <div className="stats-layout">
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><PackageCheck size={20} color="var(--primary)" /></div>
                    <div className="stat-data">
                        <label>Active Orders</label>
                        <strong>{stats.active}</strong>
                    </div>
                </div>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><TrendingUp size={20} color="#10b981" /></div>
                    <div className="stat-data">
                        <label>Monthly Spending</label>
                        <strong>R$ {stats.totalValue.toLocaleString()}</strong>
                    </div>
                </div>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><Building2 size={20} color="#3b82f6" /></div>
                    <div className="stat-data">
                        <label>Total Sites</label>
                        <strong>{stats.sitesCount}</strong>
                    </div>
                </div>
            </div>

            <StandardCard
                title="Recent Orders"
                subtitle="Track and manage the latest material requests."
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
                    width: 240px; height: 40px; transition: border-color 0.2s;
                }
                .search-bar-saas:focus-within { border-color: var(--text-muted); }
                .search-bar-saas input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }
                
                .stats-layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .stat-card-saas { 
                    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; 
                    padding: 20px; display: flex; align-items: center; gap: 16px;
                    box-shadow: var(--shadow-sm);
                }
                .stat-icon-bg { 
                    width: 40px; height: 40px; border-radius: 10px; background: var(--bg-dark); 
                    display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);
                }
                .stat-data { display: flex; flex-direction: column; gap: 2px; }
                .stat-data label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
                .stat-data strong { font-size: 24px; font-weight: 700; color: var(--text-primary); }

                .text-mono { font-family: ui-monospace, monospace; font-size: 13px; color: var(--text-muted); }
                
                @media (max-width: 1024px) {
                    .stats-layout { grid-template-columns: 1fr; }
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 20px; }
                    .header-actions { width: 100%; }
                    .search-bar-saas { flex: 1; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
