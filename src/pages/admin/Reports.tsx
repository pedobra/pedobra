import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { 
    ChevronLeft, 
    TrendingUp, 
    History,
    FileText,
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
                        seq_number: order.seq_number
                    });
                }
            });
        });
        return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

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
                            <div key={idx} className="order-history-card glass" onClick={() => navigate(`/admin/orders/visualizar/${hist.order_id}`)}>
                                <div className="hist-meta">
                                    <History size={16} />
                                    <span>#{String(hist.seq_number).padStart(4, '0')}</span>
                                    <span className="dot">•</span>
                                    <span>{new Date(hist.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="hist-body">
                                    <div className="site-tag">{hist.site_name}</div>
                                    <div className="qty-show">{hist.qty} {hist.unit} x {formatCurrency(hist.unit_value)}</div>
                                    <div className="total-label">{formatCurrency(hist.total)}</div>
                                </div>
                                <div className="hist-footer">
                                    <FileText size={14} /> Ver Pedido
                                </div>
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

                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }
                .chart-card { background: var(--bg-card); border-radius: 24px; padding: 24px; min-height: 400px; display: flex; flex-direction: column; }
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

                .orders-list-reports { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
                .order-history-card { background: var(--bg-card); padding: 20px; border-radius: 20px; border: 1px solid var(--border); cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .order-history-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .hist-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; }
                .dot { color: var(--border); }
                .hist-body { margin-bottom: 16px; }
                .site-tag { display: inline-block; background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
                .qty-show { font-size: 14px; font-weight: 600; color: var(--text-primary); }
                .total-label { font-size: 18px; font-weight: 900; color: var(--primary); margin-top: 4px; }
                .hist-footer { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: var(--text-muted); padding-top: 12px; border-top: 1px solid var(--border); }

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
