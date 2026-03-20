import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { 
    ChevronLeft, 
    TrendingUp, 
    ArrowUp,
    ArrowDown,
    Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#27c98c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const AdminReports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState('all');
    
    // Drill-down states
    const [drillDown, setDrillDown] = useState<{
        level: 0 | 1 | 2; // 0: Charts, 1: Category Details, 2: Material Details
        category?: string;
        material?: string;
    }>({ level: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, materialsRes, sitesRes] = await Promise.all([
                supabase.from('orders').select('*, sites(name)').in('status', ['completed', 'partial']),
                supabase.from('materials').select('*'),
                supabase.from('sites').select('*')
            ]);

            if (ordersRes.data) setOrders(ordersRes.data);
            if (materialsRes.data) setMaterials(materialsRes.data);
            if (sitesRes.data) setSites(sitesRes.data);
        } catch (error) {
            console.error('Error fetching reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and aggregate
    const filteredOrders = selectedSite === 'all' 
        ? orders 
        : orders.filter(o => o.site_id === selectedSite);

    // Map material_id to category
    const getMaterialCategory = (matId: string) => {
        const mat = materials.find(m => m.id === matId);
        return mat?.category || 'Outros';
    };

    // Aggregate by Category
    const categoryDataMap: Record<string, number> = {};
    const materialDataMap: Record<string, { total: number; category: string; id: string }> = {};

    filteredOrders.forEach(order => {
        const items = order.items || [];
        items.forEach((item: any) => {
            if (item.received_quantity > 0) {
                const total = item.received_quantity * (item.unit_value || 0);
                const category = getMaterialCategory(item.material_id);
                
                categoryDataMap[category] = (categoryDataMap[category] || 0) + total;
                
                const matName = item.name || 'Desconhecido';
                if (!materialDataMap[matName]) {
                    materialDataMap[matName] = { total: 0, category, id: item.material_id };
                }
                materialDataMap[matName].total += total;
            }
        });
    });

    const categoryChartData = Object.entries(categoryDataMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const materialChartData = Object.entries(materialDataMap)
        .map(([name, data]) => ({ name, value: data.total, category: data.category }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 materials

    // Table Data (Level 1: Category Details)
    const getCategoryDetails = (category: string) => {
        const mats: Record<string, { total: number; qty: number; unit: string; orders: any[] }> = {};
        filteredOrders.forEach(order => {
            order.items?.forEach((item: any) => {
                const matCat = getMaterialCategory(item.material_id);
                if (matCat === category && item.received_quantity > 0) {
                    const total = item.received_quantity * (item.unit_value || 0);
                    if (!mats[item.name]) {
                        mats[item.name] = { total: 0, qty: 0, unit: item.unit, orders: [] };
                    }
                    mats[item.name].total += total;
                    mats[item.name].qty += item.received_quantity;
                    mats[item.name].orders.push(order);
                }
            });
        });
        return Object.entries(mats).map(([name, data]) => ({ name, ...data }));
    };

    // Table Data (Level 2: Material History)
    const getMaterialHistory = (matName: string) => {
        const history: any[] = [];
        filteredOrders.forEach(order => {
            order.items?.forEach((item: any) => {
                if (item.name === matName && item.received_quantity > 0) {
                    history.push({
                        order_id: order.id,
                        created_at: order.created_at,
                        site_name: order.sites?.name,
                        qty: item.received_quantity,
                        unit: item.unit,
                        unit_value: item.unit_value,
                        total: item.received_quantity * (item.unit_value || 0),
                        seq_number: order.seq_number,
                        status: order.status
                    });
                }
            });
        });
        return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    // WoW and Trend Calculations
    const calculateTrends = () => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const currentWeekCount = filteredOrders.filter(o => new Date(o.created_at) >= oneWeekAgo).length;
        const prevWeekCount = filteredOrders.filter(o => new Date(o.created_at) >= twoWeeksAgo && new Date(o.created_at) < oneWeekAgo).length;

        const diff = currentWeekCount - prevWeekCount;
        const percent = prevWeekCount === 0 ? (currentWeekCount > 0 ? 100 : 0) : Math.round((diff / prevWeekCount) * 100);

        // Trend calculation (average per week)
        const earliest = filteredOrders.length > 0 ? new Date(Math.min(...filteredOrders.map(o => new Date(o.created_at).getTime()))) : now;
        const totalWeeks = Math.max(1, (now.getTime() - earliest.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const avgPerWeek = Math.round(filteredOrders.length / totalWeeks);

        return { currentWeekCount, prevWeekCount, diff, percent, avgPerWeek };
    };

    const trends = calculateTrends();

    if (loading) return <div className="loading-box">Carregando relatórios...</div>;

    return (
        <div className="reports-container animate-fade">
            <div className="reports-header-box">
                <div className="title-section">
                    <TrendingUp size={24} color="var(--primary)" />
                    <div>
                        <h1>Painel de Relatórios</h1>
                        <p>Análise de consumo e custos por obra.</p>
                    </div>
                </div>
                
                <div className="filters-section">
                    <div className="filter-group">
                        <Building2 size={16} />
                        <select 
                            value={selectedSite} 
                            onChange={(e) => {
                                setSelectedSite(e.target.value);
                                setDrillDown({ level: 0 });
                            }}
                        >
                            <option value="all">Todas as Obras</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {drillDown.level === 0 && (
                <div className="charts-grid">
                    <div className="chart-card glass">
                        <div className="card-header">
                            <h3>Custos por Categoria</h3>
                            <span>Distribuição percentual do gasto total.</span>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={categoryChartData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        onClick={(data) => setDrillDown({ level: 1, category: data.name })}
                                        cursor="pointer"
                                    >
                                        {categoryChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-card glass">
                        <div className="card-header">
                            <h3>Top Materiais (Custo)</h3>
                            <span>Top 10 materiais com maior investimento.</span>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={materialChartData} layout="vertical" onClick={(data) => {
                                    if (data?.activeLabel) setDrillDown({ level: 2, material: String(data.activeLabel) });
                                }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '10px', fill: 'var(--text-muted)' } as React.CSSProperties} />
                                    <Tooltip 
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer">
                                        {materialChartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-card glass trend-card-custom">
                        <div className="card-header">
                            <h3>Volume de Pedidos</h3>
                            <span>Comparativo semanal e tendência.</span>
                        </div>
                        <div className="trend-content">
                            <div className="trend-main-stat">
                                <div className="stat-value">{filteredOrders.length}</div>
                                <div className="stat-label">Total de Pedidos Realizados</div>
                            </div>

                            <div className="wow-comparison">
                                <div className="wow-box">
                                    <span className="wow-label">SEMANA ATUAL</span>
                                    <span className="wow-val">{trends.currentWeekCount}</span>
                                </div>
                                <div className={`wow-indicator ${trends.diff >= 0 ? 'positive' : 'negative'}`}>
                                    {trends.diff >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                    <span>{Math.abs(trends.percent)}%</span>
                                </div>
                                <div className="wow-box">
                                    <span className="wow-label">SEMANA PASSADA</span>
                                    <span className="wow-val">{trends.prevWeekCount}</span>
                                </div>
                            </div>

                            <div className={`trend-projection ${trends.diff < 0 ? 'bg-green' : trends.diff > 0 ? 'bg-red' : 'bg-yellow'}`}>
                                <div className="projection-header">
                                    <TrendingUp size={14} />
                                    <span>TENDÊNCIA PRÓXIMA SEMANA</span>
                                </div>
                                <div className="projection-value">
                                    ~{trends.avgPerWeek} Pedidos
                                    <small>Baseado no histórico total</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {drillDown.level === 1 && (
                <div className="drill-down-content animate-slide-up">
                    <div className="drill-header">
                        <button className="btn-back" onClick={() => setDrillDown({ level: 0 })}>
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        <h2>Detalhamento: {drillDown.category}</h2>
                    </div>
                    
                    <div className="stats-table-wrapper glass">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Qtd Total</th>
                                    <th>Un</th>
                                    <th>Total Investido</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getCategoryDetails(drillDown.category!).map((item, idx) => (
                                    <tr key={idx} onClick={() => setDrillDown({ level: 2, material: item.name, category: drillDown.category })} className="clickable-row">
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.qty.toLocaleString()}</td>
                                        <td>{item.unit}</td>
                                        <td className="value-cell">{formatCurrency(item.total)}</td>
                                        <td><button className="btn-view-small">Histórico</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {drillDown.level === 2 && (
                <div className="drill-down-content animate-slide-up">
                    <div className="drill-header">
                        <button className="btn-back" onClick={() => setDrillDown({ 
                            level: drillDown.category ? 1 : 0, 
                            category: drillDown.category 
                        })}>
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        <h2>Histórico: {drillDown.material}</h2>
                    </div>
                    
                    <div className="orders-list-reports">
                        {getMaterialHistory(drillDown.material!).map((hist, idx) => (
                            <div 
                                key={idx} 
                                className={`order-history-pill status-${hist.status}`} 
                                onClick={() => navigate(`/admin/orders/visualizar/${hist.order_id}`)}
                            >
                                <span className="pill-ref">{getOrderRef(hist)}</span>
                                <div className="pill-status">
                                    <span className="dot"></span>
                                    {hist.status === 'completed' ? 'Concluído' : 'Recebido Parcial'}
                                </div>
                                <span className="pill-date">{new Date(hist.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .reports-container { padding: 24px; color: var(--text-primary); }
                .reports-header-box { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 20px; flex-wrap: wrap; }
                .title-section { display: flex; gap: 16px; align-items: center; }
                .title-section h1 { font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
                .title-section p { color: var(--text-muted); font-size: 14px; font-weight: 500; }
                
                .filters-section { display: flex; gap: 12px; }
                .filter-group { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; padding: 0 16px; height: 44px; gap: 8px; }
                .filter-group select { background: transparent; border: none; color: var(--text-primary); font-size: 13px; font-weight: 700; outline: none; min-width: 150px; }

                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
                .chart-card { background: var(--bg-card); border-radius: 24px; padding: 24px; min-height: 400px; display: flex; flex-direction: column; }
                .trend-card-custom { display: flex; flex-direction: column; justify-content: space-between; }
                .trend-content { flex: 1; display: flex; flex-direction: column; justify-content: space-around; padding: 10px 0; }
                
                .trend-main-stat { text-align: center; }
                .trend-main-stat .stat-value { font-size: 48px; font-weight: 900; color: var(--primary); line-height: 1; }
                .trend-main-stat .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 700; margin-top: 8px; text-transform: uppercase; }

                .wow-comparison { display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); padding: 16px; border-radius: 16px; margin: 20px 0; border: 1px solid var(--border); }
                .wow-box { display: flex; flex-direction: column; align-items: center; }
                .wow-label { font-size: 9px; font-weight: 800; color: var(--text-muted); margin-bottom: 4px; }
                .wow-val { font-size: 18px; font-weight: 900; }
                
                .wow-indicator { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 100px; font-size: 12px; font-weight: 800; }
                .wow-indicator.positive { background: rgba(39, 201, 140, 0.1); color: #27c98c; }
                .wow-indicator.negative { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .trend-projection { color: #111; padding: 16px; border-radius: 20px; text-align: center; border: 3px solid transparent; }
                .trend-projection.bg-green { background: rgba(39, 201, 140, 0.05); border-color: #27c98c; }
                .trend-projection.bg-red { background: rgba(239, 68, 68, 0.05); border-color: #ef4444; }
                .trend-projection.bg-yellow { background: rgba(245, 158, 11, 0.05); border-color: #f59e0b; }
                .projection-header { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 10px; font-weight: 800; margin-bottom: 8px; color: var(--text-muted); }
                .projection-value { font-size: 20px; font-weight: 900; }
                .projection-value small { display: block; font-size: 9px; opacity: 0.8; font-weight: 500; margin-top: 4px; color: var(--text-muted); }
                .card-header { margin-bottom: 24px; }
                .card-header h3 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
                .card-header span { font-size: 12px; color: var(--text-muted); font-weight: 600; }
                .chart-wrapper { flex: 1; min-height: 300px; }

                .btn-back { display: flex; align-items: center; gap: 8px; background: rgba(59, 130, 246, 0.1); color: var(--primary); border: 1px solid rgba(59, 130, 246, 0.2); padding: 8px 16px; border-radius: 100px; font-size: 12px; font-weight: 800; margin-bottom: 16px; transition: 0.2s; }
                .btn-back:hover { background: var(--primary); color: var(--bg-dark); }

                .drill-header { display: flex; flex-direction: column; margin-bottom: 24px; }
                .drill-header h2 { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }

                .stats-table-wrapper { background: var(--bg-card); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); }
                .stats-table { width: 100%; border-collapse: collapse; text-align: left; }
                .stats-table th { background: rgba(0,0,0,0.2); padding: 16px 24px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
                .stats-table td { padding: 16px 24px; font-size: 14px; border-bottom: 1px solid var(--border); }
                .clickable-row { cursor: pointer; transition: 0.2s; }
                .clickable-row:hover { background: rgba(255,255,255,0.03); }
                .value-cell { font-weight: 800; color: var(--primary); }
                .btn-view-small { background: transparent; border: 1px solid var(--border); color: var(--text-muted); font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 6px; }

                .orders-list-reports { display: flex; flex-direction: column; gap: 12px; padding: 10px 0; }
                .order-history-pill { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between;
                    padding: 0 40px;
                    height: 54px;
                    background: rgba(39, 201, 140, 0.03);
                    border: 3px solid #27c98c;
                    border-radius: 100px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .order-history-pill.status-partial {
                    background: rgba(245, 158, 11, 0.03);
                    border-color: #f59e0b;
                }
                .order-history-pill:hover {
                    transform: scale(1.02);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                .pill-ref { font-size: 18px; font-weight: 900; color: #111; letter-spacing: -0.5px; }
                .pill-status { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 800; color: #333; }
                .pill-status .dot { width: 10px; height: 10px; background: #27c98c; border-radius: 50%; }
                .status-partial .pill-status .dot { background: #f59e0b; }
                .pill-date { font-size: 18px; font-weight: 900; color: #111; }

                .loading-box { height: 60vh; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--text-muted); }

                @media (max-width: 768px) {
                    .reports-header-box { flex-direction: column; }
                    .charts-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default AdminReports;
