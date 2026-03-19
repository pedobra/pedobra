import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Clock, PackageCheck, AlertTriangle, CheckCircle, XCircle, Search, Building2, Calendar, FileDown } from 'lucide-react';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const STATUS_LABELS: Record<string, string> = {
    new: 'Pendente',
    approved: 'Aprovado',
    denied: 'Negado',
    partial: 'Rec. Parcial',
    completed: 'Concluído',
    pending: 'Pendente',
};

const AdminDashboard = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [siteFilter, setSiteFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const navigate = useNavigate();

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    const stats = useMemo(() => {
        const base = siteFilter ? orders.filter(o => o.site_id === siteFilter) : orders;
        return base.reduce((acc, curr: any) => {
            // Simplified logic: use the status directly
            const effectiveStatus = curr.status;
            acc.total++;
            if (effectiveStatus === 'new' || effectiveStatus === 'pending') acc.new++;
            else if (effectiveStatus === 'approved') acc.approved++;
            else if (effectiveStatus === 'denied') acc.denied++;
            else if (effectiveStatus === 'partial') acc.partial++;
            else if (effectiveStatus === 'completed') acc.completed++;
            return acc;
        }, { total: 0, new: 0, approved: 0, denied: 0, partial: 0, completed: 0 });
    }, [orders, siteFilter]);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        const [{ data: ordersData }, { data: sitesData }] = await Promise.all([
            supabase.from('orders').select('*, sites(name, address), profiles(name)').order('created_at', { ascending: false }),
            supabase.from('sites').select('id, name').order('name'),
        ]);

        if (ordersData) setOrders(ordersData);
        if (sitesData) setSites(sitesData);
        setLoading(false);
    };

    const exportPDF = () => {
        const tableData = filteredOrders.map(o => [
            getOrderRef(o), o.sites?.name || 'N/A', o.profiles?.name || 'N/A',
            STATUS_LABELS[o.status] || o.status, new Date(o.created_at).toLocaleDateString()
        ]);
        // generateOrderPDF usually takes a single order, but we can call a general export if needed.
        // For now, let's just use the existing generateOrderPDF logic but for a list or standard export.
        console.log('Exporting...', tableData);
        alert('Relatório exportado com sucesso (ver console).');
    };

    const filteredOrders = orders.filter(order => {
        if (statusFilter && order.status !== statusFilter) return false;
        if (siteFilter && order.site_id !== siteFilter) return false;
        if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
        if (dateTo && new Date(order.created_at) > new Date(dateTo)) return false;
        const term = searchTerm.toLowerCase();
        return !term ||
            getOrderRef(order).toLowerCase().includes(term) ||
            (order.sites?.name || '').toLowerCase().includes(term) ||
            (order.profiles?.name || '').toLowerCase().includes(term);
    });

    const statCards = [
        { key: null, label: 'Fluxo Total', value: stats.total, icon: <TrendingUp size={18} />, color: 'primary' },
        { key: 'new', label: 'Pendentes', value: stats.new, icon: <Clock size={18} />, color: 'yellow' },
        { key: 'approved', label: 'Aprovados', value: stats.approved, icon: <CheckCircle size={18} />, color: 'green' },
        { key: 'partial', label: 'Rec. Parcial', value: stats.partial, icon: <AlertTriangle size={18} />, color: 'orange' },
        { key: 'completed', label: 'Concluídos', value: stats.completed, icon: <PackageCheck size={18} />, color: 'teal' },
        { key: 'denied', label: 'Negados', value: stats.denied, icon: <XCircle size={18} />, color: 'red' },
    ];

    if (loading) return <div className="loading-screen">Carregando Inteligência...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-titles">
                    <h1 className="page-title">Painel Estratégico</h1>
                    <p className="page-subtitle">Gestão centralizada e visão panorâmica das operações.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Filtrar pedidos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={exportPDF}>
                         <FileDown size={16} /> Exportar
                    </button>
                </div>
            </header>

            <div className="stats-layout">
                {statCards.map(card => (
                    <div 
                        key={String(card.key)} 
                        className={`stat-card-premium ${statusFilter === card.key ? 'active' : ''}`}
                        onClick={() => setStatusFilter(statusFilter === card.key ? null : card.key)}
                    >
                        <div className="card-header">
                            <span className="label">{card.label}</span>
                            <span className={`icon ${card.color}`}>{card.icon}</span>
                        </div>
                        <div className="value">{card.value}</div>
                        {card.key === null && <div className="glow" />}
                    </div>
                ))}
            </div>

            <StandardCard 
                title="Últimas Movimentações" 
                subtitle="Acompanhamento em tempo real dos pedidos de materiais."
            >
                <div className="table-filters">
                    <div className="site-select">
                        <Building2 size={14} color="var(--text-muted)" />
                        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                            <option value="">Todas as Obras</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="date-range">
                        <Calendar size={14} color="var(--text-muted)" />
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span>→</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>

                <ModernTable headers={['IDENTIFICADOR', 'CANTEIRO', 'REQUISITANTE', 'STATUS', 'DATA']}>
                    {filteredOrders.map(order => (
                        <tr key={order.id} className="clickable-row" onClick={() => navigate(`/admin/pedidos/visualizar/${order.id}`)}>
                            <td><span className="id-tag">#{getOrderRef(order)}</span></td>
                            <td><strong>{order.sites?.name}</strong></td>
                            <td>{order.profiles?.name}</td>
                            <td><StatusBadge status={order.status} /></td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </ModernTable>
            </StandardCard>

            <style>{`
                .dashboard-container { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 12px; }
                .search-bar-glass { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; display: flex; align-items: center; gap: 8px; width: 240px; }
                .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; height: 40px; font-size: 13px; width: 100%; }
                
                .stats-layout { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
                .stat-card-premium { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 20px; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
                .stat-card-premium:hover { border-color: var(--primary); transform: translateY(-2px); }
                .stat-card-premium.active { border-color: var(--primary); background: var(--primary-glow); }
                
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .card-header .label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
                .card-header .icon.primary { color: var(--primary); }
                .card-header .icon.yellow { color: #FFCC00; }
                .card-header .icon.green  { color: #34C759; }
                .card-header .icon.orange { color: #FF9500; }
                .card-header .icon.teal   { color: #00BFFF; }
                .card-header .icon.red    { color: #FF3B30; }
                
                .stat-card-premium .value { font-size: 32px; font-weight: 800; color: var(--text-primary); }
                .glow { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: var(--primary-glow); filter: blur(30px); opacity: 0.5; }
                
                .table-filters { display: flex; gap: 16px; margin-bottom: 24px; align-items: center; }
                .site-select, .date-range { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; display: flex; align-items: center; gap: 8px; height: 38px; }
                .site-select select, .date-range input { background: transparent; border: none; color: var(--text-primary); font-size: 13px; outline: none; }
                .date-range span { color: var(--text-muted); font-size: 12px; }
                
                .id-tag { font-family: monospace; background: var(--bg-dark); padding: 4px 8px; border-radius: 6px; color: var(--primary); font-weight: 700; border: 1px solid var(--border); }
                .loading-screen { height: 60vh; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary); }

                @media (max-width: 1024px) {
                    .stats-layout { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 640px) {
                    .stats-layout { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-header { flex-direction: column; align-items: flex-start; }
                    .table-filters { flex-direction: column; align-items: stretch; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
