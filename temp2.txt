import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    FileDown,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
    Calendar,
    MoreVertical,
    Search,
    Trash2,
    Edit2,
    PackageCheck,
    AlertTriangle,
    Building2,
    Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateOrderPDF } from '../../lib/generateOrderPDF';

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
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [priceSuggestions, setPriceSuggestions] = useState<Record<string, { supplierName: string; unitValue: number }>>({});
    const [loadingPrices, setLoadingPrices] = useState(false);
    const navigate = useNavigate();

    // Normalize item name: strip [COMPLEMENTO REF XXXX] prefix for matching
    const normalizeName = (name: string) =>
        name.replace(/^\[COMPLEMENTO REF [\w_]+\]\s*/i, '').trim().toLowerCase();

    const isPending = (s: string) => s === 'new' || s === 'pending';

    // When a modal opens, fetch best prices from last 15 days (only for pending orders)
    useEffect(() => {
        if (!viewingOrder) { setPriceSuggestions({}); return; }

        // Não-pendente: lê hints já persistidos nos itens (valor fixo)
        if (!isPending(viewingOrder.status)) {
            const stored: Record<string, { supplierName: string; unitValue: number }> = {};
            (viewingOrder.items || []).forEach((item: any) => {
                if (item.price_hint && item.price_hint_supplier) {
                    stored[item.name] = { supplierName: item.price_hint_supplier, unitValue: item.price_hint };
                }
            });
            setPriceSuggestions(stored);
            return;
        }

        // Pendente: busca ao vivo e persiste nos itens
        const items = viewingOrder.items || [];
        if (items.length === 0) return;

        const fetchPrices = async () => {
            setLoadingPrices(true);
            const since = new Date();
            since.setDate(since.getDate() - 15);

            const [{ data: recentOrders }, { data: suppliersData }] = await Promise.all([
                supabase.from('orders').select('items, received_at').in('status', ['completed', 'partial']).gte('received_at', since.toISOString()),
                supabase.from('suppliers').select('id, name'),
            ]);

            const supplierMap: Record<string, string> = {};
            suppliersData?.forEach((s: any) => { supplierMap[s.id] = s.name; });

            const priceMap: Record<string, { supplierName: string; unitValue: number }[]> = {};
            recentOrders?.forEach((order: any) => {
                (order.items || []).forEach((it: any) => {
                    const uv = parseFloat(it.unit_value) || 0;
                    const sup = it.supplier_id ? supplierMap[it.supplier_id] : null;
                    if (!uv || !sup) return;
                    const key = normalizeName(it.name || '');
                    if (!key) return;
                    if (!priceMap[key]) priceMap[key] = [];
                    priceMap[key].push({ supplierName: sup, unitValue: uv });
                });
            });

            const hints: Record<string, { supplierName: string; unitValue: number }> = {};
            items.forEach((item: any) => {
                const key = normalizeName(item.name || '');
                const prices = priceMap[key];
                if (!prices || prices.length === 0) return;
                hints[item.name] = prices.reduce((a, b) => a.unitValue <= b.unitValue ? a : b);
            });

            setPriceSuggestions(hints);

            // Persiste os hints nos itens para ficarem fixos após aprovação
            const updatedItems = items.map((item: any) => ({
                ...item,
                price_hint: hints[item.name]?.unitValue ?? item.price_hint ?? null,
                price_hint_supplier: hints[item.name]?.supplierName ?? item.price_hint_supplier ?? null,
            }));
            await supabase.from('orders').update({ items: updatedItems }).eq('id', viewingOrder.id);

            setLoadingPrices(false);
        };

        fetchPrices();
    }, [viewingOrder]);

    // Stats calculados dinamicamente conforme a obra selecionada
    const stats = useMemo(() => {
        const base = siteFilter ? orders.filter(o => o.site_id === siteFilter) : orders;
        return base.reduce((acc, curr: any) => {
            acc.total++;
            const st = curr.status as string;
            if (st === 'new' || st === 'pending') acc.new++;
            else if (st === 'approved') acc.approved++;
            else if (st === 'denied') acc.denied++;
            else if (st === 'partial') acc.partial++;
            else if (st === 'completed') acc.completed++;
            return acc;
        }, { total: 0, new: 0, approved: 0, denied: 0, partial: 0, completed: 0 });
    }, [orders, siteFilter]);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        const [{ data: ordersData }, { data: sitesData }] = await Promise.all([
            supabase.from('orders').select('*, sites(name, address), profiles(name)').order('created_at', { ascending: false }),
            supabase.from('sites').select('id, name').order('name'),
        ]);

        if (ordersData) {
            setOrders(ordersData);
        }
        if (sitesData) setSites(sitesData);
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        let updatePayload: any = { status: newStatus };
        if (newStatus === 'approved') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
                updatePayload.approved_by_name = profile?.name || 'Admin';
            }
            updatePayload.approved_at = new Date().toISOString();
        }
        const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
        if (!error) fetchDashboardData();
        else alert('Erro ao atualizar: ' + error.message);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) { fetchDashboardData(); setViewingOrder(null); }
        else alert('Erro ao excluir pedido: ' + error.message);
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    const exportPDF = () => {
        const doc = new jsPDF() as any;
        doc.setFont("helvetica", "bold");
        doc.text('PEDOBRA - RELATÓRIO EXECUTIVO', 14, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 26);
        const tableData = filteredOrders.map(o => [
            getOrderRef(o), o.sites?.name || 'N/A', o.profiles?.name || 'N/A',
            STATUS_LABELS[o.status] || o.status, new Date(o.created_at).toLocaleDateString()
        ]);
        doc.autoTable({ head: [['REF', 'OBRA', 'REQUISITANTE', 'STATUS', 'DATA']], body: tableData, startY: 35, theme: 'grid', headStyles: { fillColor: [20, 20, 23], textColor: [255, 215, 0] }, styles: { fontSize: 8 } });
        doc.save(`relatorio_executivo_${Date.now()}.pdf`);
    };

    const filteredOrders = orders.filter(order => {
        if (statusFilter && order.status !== statusFilter) return false;
        if (siteFilter && order.site_id !== siteFilter) return false;
        if (dateFrom) {
            const orderDate = new Date(order.created_at);
            orderDate.setHours(0, 0, 0, 0);
            if (orderDate < new Date(dateFrom + 'T00:00:00')) return false;
        }
        if (dateTo) {
            const orderDate = new Date(order.created_at);
            orderDate.setHours(0, 0, 0, 0);
            if (orderDate > new Date(dateTo + 'T00:00:00')) return false;
        }
        const term = searchTerm.toLowerCase();
        return !term ||
            getOrderRef(order).toLowerCase().includes(term) ||
            (order.sites?.name || '').toLowerCase().includes(term) ||
            (order.profiles?.name || '').toLowerCase().includes(term) ||
            (STATUS_LABELS[order.status] || '').toLowerCase().includes(term);
    });

    const statCards = [
        { key: null, label: 'Fluxo Total', value: stats.total, icon: <TrendingUp size={18} />, color: 'gold', valueClass: '' },
        { key: 'new', label: 'Pendentes', value: stats.new, icon: <Clock size={18} />, color: 'yellow', valueClass: 'text-yellow' },
        { key: 'approved', label: 'Aprovados', value: stats.approved, icon: <CheckCircle size={18} />, color: 'green', valueClass: 'text-green' },
        { key: 'partial', label: 'Rec. Parcial', value: stats.partial, icon: <AlertTriangle size={18} />, color: 'orange', valueClass: 'text-orange' },
        { key: 'completed', label: 'Concluídos', value: stats.completed, icon: <PackageCheck size={18} />, color: 'teal', valueClass: 'text-teal' },
        { key: 'denied', label: 'Negados', value: stats.denied, icon: <XCircle size={18} />, color: 'red', valueClass: 'text-red' },
    ];

    if (loading) return (
        <div className="admin-loading">
            <div className="loader"></div>
            <span>Carregando Inteligência...</span>
            <style>{`.admin-loading { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: var(--primary); font-weight: 600; letter-spacing: 1px; }`}</style>
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-titles">
                    <h1 className="page-title">Painel Estratégico</h1>
                    <p className="page-subtitle">Visão panorâmica de todas as operações em tempo real.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Filtrar pedidos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="site-filter-wrap">
                        <Building2 size={15} color="var(--text-muted)" />
                        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                            <option value="">Todas as Obras</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button className="btn-primary" onClick={exportPDF}>
                        <FileDown size={16} /> Exportar
                    </button>
                </div>
            </header>

            {/* ── Status Cards ── */}
            <div className="stats-layout">
                {statCards.map(card => (
                    <div
                        key={String(card.key)}
                        className={`stat-card-premium ${card.color} ${statusFilter === card.key ? 'active-filter' : ''}`}
                        onClick={() => setStatusFilter(statusFilter === card.key ? null : card.key)}
                    >
                        <div className="card-top">
                            <span className="card-label">{card.label}</span>
                            <span className={`card-icon ${card.color}`}>{card.icon}</span>
                        </div>
                        <div className={`card-value ${card.valueClass}`}>{card.value}</div>
                        {card.key === null && <div className="glow" />}
                    </div>
                ))}
            </div>

            {/* ── Table ── */}
            <section className="table-section">
                <div className="section-header">
                    <h2 className="section-title">Últimas Movimentações
                        {(statusFilter || siteFilter) && (
                            <span className="filter-active-tag">
                                {statusFilter ? STATUS_LABELS[statusFilter] : ''}
                                {statusFilter && siteFilter ? ' · ' : ''}
                                {siteFilter ? sites.find(s => s.id === siteFilter)?.name : ''}
                                <button onClick={() => { setStatusFilter(null); setSiteFilter(''); }}>✕</button>
                            </span>
                        )}
                    </h2>
                    <div className="date-filter-wrap">
                        <div className="date-pill">
                            <Calendar size={14} color="var(--text-muted)" />
                            <input
                                type="date"
                                className="date-filter-input"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                title="Data inicial"
                            />
                        </div>
                        <span className="date-filter-sep">→</span>
                        <div className="date-pill">
                            <Calendar size={14} color="var(--text-muted)" />
                            <input
                                type="date"
                                className="date-filter-input"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                title="Data final"
                            />
                        </div>
                        {(dateFrom || dateTo) && (
                            <button className="date-filter-clear" onClick={() => { setDateFrom(''); setDateTo(''); }} title="Limpar período">✕</button>
                        )}
                    </div>
                </div>

                <div className="premium-table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>IDENTIFICADOR</th>
                                <th>CANTEIRO DE OBRA</th>
                                <th>SOLICITANTE</th>
                                <th>STATUS</th>
                                <th>DATA</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => {
                                const childOrder = order.status === 'partial' ? orders.find(o => o.items?.some((i: any) => i.name?.includes(`[COMPLEMENTO REF ${getOrderRef(order)}]`))) : null;
                                const isRealCompleted = order.status === 'completed' || (order.status === 'partial' && childOrder?.status === 'completed');
                                const finalUiStatus = isRealCompleted ? 'completed' : order.status;

                                return (
                                    <tr key={order.id} className="clickable-row" onClick={() => setViewingOrder(order)}>
                                        <td><span className="id-tag">#{getOrderRef(order)}</span></td>
                                        <td><strong>{order.sites?.name}</strong></td>
                                        <td>{order.profiles?.name}</td>
                                        <td>
                                            <div className={`status-pill ${finalUiStatus}`}>
                                                <span className="dot" />
                                                {STATUS_LABELS[finalUiStatus] || finalUiStatus}
                                            </div>
                                        </td>
                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="row-action-btn" onClick={e => e.stopPropagation()}>
                                                <MoreVertical size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        Nenhum pedido encontrado para o filtro selecionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Modal de Detalhes ── */}
            {viewingOrder && (
                <div className="modal-overlay glass" onClick={() => setViewingOrder(null)}>
                    <div className="modal-card animate-fade" onClick={e => e.stopPropagation()} style={{ width: '600px', padding: '40px', background: '#f8f9fa', color: '#111', borderRadius: '24px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#111' }}>PEDIDO Nº {getOrderRef(viewingOrder)}</h2>
                            <p style={{ color: '#666', marginTop: '8px' }}>Obra: <strong style={{ color: '#111' }}>{viewingOrder.sites?.name || 'Desconhecida'}</strong> | Por: <strong style={{ color: '#111' }}>{viewingOrder.profiles?.name || 'Admin'}</strong></p>
                            <p style={{ color: '#888', marginTop: '4px', fontSize: '13px' }}>Data: {new Date(viewingOrder.created_at).toLocaleString('pt-BR')}</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #eaeaea', maxHeight: '45vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: '#888', fontSize: '11px', letterSpacing: '2px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>ITENS SOLICITADOS</h4>
                                <span style={{ fontSize: '10px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={11} color="#f39c12" />
                                    Sugestão: menor preço — últimos 15 dias
                                </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>MATERIAL</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>UN</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', width: '60px', textAlign: 'right' }}>QTDE</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#f39c12', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right', width: '80px' }}>MENOR R$</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#f39c12', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'left', paddingLeft: '12px' }}>FORNECEDOR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewingOrder.items || []).map((item: any, idx: number) => {
                                        const border = idx !== viewingOrder.items.length - 1 ? '1px solid #f0f0f0' : 'none';
                                        const hint = priceSuggestions[item.name];
                                        return (
                                            <tr key={idx}>
                                                <td style={{ padding: '12px 0', borderBottom: border, fontWeight: 600, color: '#222', fontSize: '13px' }}>{item.name}</td>
                                                <td style={{ padding: '12px 0', borderBottom: border, color: '#666', textAlign: 'center', fontSize: '13px' }}>{item.unit || 'un'}</td>
                                                <td style={{ padding: '12px 0', borderBottom: border, color: '#111', fontWeight: 900, textAlign: 'right', fontSize: '15px' }}>{item.quantity}</td>
                                                <td style={{ padding: '12px 0', borderBottom: border, textAlign: 'right', fontSize: '12px' }}>
                                                    {loadingPrices ? (
                                                        <span style={{ color: '#ccc' }}>...</span>
                                                    ) : hint ? (
                                                        <span style={{ fontWeight: 700, color: '#27ae60', fontFamily: 'monospace' }}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hint.unitValue)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 0 12px 12px', borderBottom: border }}>
                                                    {!loadingPrices && hint ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#27ae60', whiteSpace: 'nowrap' }}>
                                                            <Sparkles size={10} /> {hint.supplierName}
                                                        </span>
                                                    ) : !loadingPrices ? (
                                                        <span style={{ color: '#ccc', fontSize: '11px' }}>Sem histórico</span>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                            <button onClick={() => { setViewingOrder(null); navigate('/admin/orders'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', background: '#eaeaea', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                <Edit2 size={15} /> Alterar
                            </button>
                            <button onClick={() => handleDelete(viewingOrder.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                <Trash2 size={15} /> Excluir
                            </button>
                            <button onClick={e => { e.stopPropagation(); generateOrderPDF(viewingOrder, viewingOrder.profiles?.name || 'Admin'); }} style={{ background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                                <FileDown size={15} /> Gerar PDF
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                            {viewingOrder.status === 'approved' && <>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'new'); setViewingOrder({ ...viewingOrder, status: 'new' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#FF9500', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Pendente</button>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'denied'); setViewingOrder({ ...viewingOrder, status: 'denied' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#FF3B30', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}><XCircle size={16} /> Negar</button>
                            </>}
                            {(viewingOrder.status === 'new' || viewingOrder.status === 'pending') && <>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'approved'); setViewingOrder({ ...viewingOrder, status: 'approved' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#34C759', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Aprovar</button>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'denied'); setViewingOrder({ ...viewingOrder, status: 'denied' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#FF3B30', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}><XCircle size={16} /> Negar</button>
                            </>}
                            {viewingOrder.status === 'denied' && <>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'approved'); setViewingOrder({ ...viewingOrder, status: 'approved' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#34C759', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}><CheckCircle size={16} /> Aprovar</button>
                                <button onClick={() => { updateStatus(viewingOrder.id, 'new'); setViewingOrder({ ...viewingOrder, status: 'new' }); }} style={{ padding: '11px 20px', borderRadius: '12px', background: '#FF9500', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Pendente</button>
                            </>}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '24px' }}>
                            <button onClick={() => setViewingOrder(null)} style={{ border: '1px solid #ccc', background: 'transparent', color: '#555', cursor: 'pointer', fontWeight: 600, width: '100%', padding: '13px', borderRadius: '12px' }}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .dashboard-container { display: flex; flex-direction: column; gap: 32px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; }
        .page-title { font-size: 30px; font-weight: 800; margin-bottom: 6px; }
        .page-subtitle { color: var(--text-secondary); font-size: 13px; }

        .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .search-bar-glass {
            background: rgba(255,255,255,0.03); border: 1px solid var(--border);
            border-radius: 12px; padding: 0 14px; display: flex; align-items: center; gap: 10px; width: 220px; height: 42px;
        }
        .search-bar-glass input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 13px; }

        /* Filtro por obra */
        .site-filter-wrap {
            background: rgba(255,255,255,0.03); border: 1px solid var(--border);
            border-radius: 12px; padding: 0 14px; display: flex; align-items: center; gap: 8px; height: 42px;
        }
        .site-filter-wrap select {
            background: transparent; border: none; color: white; outline: none; font-size: 13px;
            cursor: pointer; max-width: 160px;
        }
        .site-filter-wrap select option { background: #1a1a1f; color: white; }

        /* Cards */
        .stats-layout { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
        .stat-card-premium {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: 18px; padding: 18px 20px; position: relative; overflow: hidden;
            transition: 0.25s; cursor: pointer;
        }
        .stat-card-premium:hover { transform: translateY(-3px); border-color: var(--border-bright); }
        .stat-card-premium.active-filter { box-shadow: 0 0 0 2px currentColor; }
        .stat-card-premium.gold.active-filter  { box-shadow: 0 0 0 2px var(--primary); }
        .stat-card-premium.green.active-filter  { box-shadow: 0 0 0 2px var(--status-approved); }
        .stat-card-premium.red.active-filter    { box-shadow: 0 0 0 2px var(--status-denied); }
        .stat-card-premium.yellow.active-filter { box-shadow: 0 0 0 2px #f39c12; }
        .stat-card-premium.orange.active-filter { box-shadow: 0 0 0 2px #e67e22; }
        .stat-card-premium.teal.active-filter   { box-shadow: 0 0 0 2px #1abc9c; }

        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .card-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
        .card-icon { opacity: 0.7; }
        .card-icon.gold   { color: var(--primary); }
        .card-icon.green  { color: var(--status-approved); }
        .card-icon.red    { color: var(--status-denied); }
        .card-icon.yellow { color: #f39c12; }
        .card-icon.orange { color: #e67e22; }
        .card-icon.teal   { color: #1abc9c; }

        .card-value { font-size: 32px; font-weight: 800; font-family: var(--font-display); }
        .text-green  { color: var(--status-approved); }
        .text-red    { color: var(--status-denied); }
        .text-yellow { color: #f39c12; }
        .text-orange { color: #e67e22; }
        .text-teal   { color: #1abc9c; }
        .glow { position: absolute; width: 80px; height: 80px; background: var(--primary-glow); filter: blur(40px); top: -10px; right: -10px; z-index: 0; }

        /* Table section */
        .table-section { display: flex; flex-direction: column; gap: 20px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-size: 18px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 12px; }
        .filter-active-tag {
            font-size: 11px; font-weight: 600; color: var(--primary);
            background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.2);
            padding: 3px 10px 3px 12px; border-radius: 100px;
            display: inline-flex; align-items: center; gap: 8px;
        }
        .filter-active-tag button { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 12px; padding: 0; }
        .date-filter-wrap { display: flex; align-items: center; gap: 8px; }
        .date-pill {
            background: rgba(255,255,255,0.03); border: 1px solid var(--border);
            border-radius: 12px; padding: 0 14px; display: flex; align-items: center;
            gap: 8px; height: 42px; cursor: pointer; transition: 0.2s;
        }
        .date-pill:hover { border-color: var(--border-bright); background: rgba(255,255,255,0.06); }
        .date-filter-input { background: transparent; border: none; color: white; outline: none; font-size: 13px; cursor: pointer; width: 118px; color-scheme: dark; }
        .date-filter-sep { color: var(--text-muted); font-size: 13px; }
        .date-filter-clear { background: rgba(255,59,48,0.08); border: 1px solid rgba(255,59,48,0.2); color: #FF3B30; cursor: pointer; font-size: 12px; padding: 6px 10px; border-radius: 10px; transition: 0.2s; }
        .date-filter-clear:hover { background: rgba(255,59,48,0.18); }

        .premium-table-wrapper { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border); overflow: hidden; }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
        .modern-table th { padding: 16px 20px; font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 16px 20px; font-size: 13px; border-bottom: 1px solid var(--border); }
        .modern-table tr:last-child td { border-bottom: none; }
        .clickable-row { cursor: pointer; transition: 0.2s; }
        .clickable-row:hover { background: rgba(255,255,255,0.04); }

        .id-tag { background: var(--bg-input); padding: 5px 9px; border-radius: 7px; font-family: monospace; font-size: 12px; color: var(--primary); }

        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 100px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .status-pill.new       { background: rgba(255,215,0,0.08);  color: var(--primary); }
        .status-pill.pending   { background: rgba(255,215,0,0.08);  color: var(--primary); }
        .status-pill.approved  { background: rgba(52,199,89,0.1);   color: var(--status-approved); }
        .status-pill.denied    { background: rgba(255,59,48,0.1);   color: var(--status-denied); }
        .status-pill.partial   { background: rgba(230,126,34,0.1);  color: #e67e22; }
        .status-pill.completed { background: rgba(26,188,156,0.1);  color: #1abc9c; }
        .status-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        .row-action-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s; }
        .row-action-btn:hover { color: white; background: rgba(255,255,255,0.06); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; }
        .modal-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 24px 48px rgba(0,0,0,0.5); }

        @media (max-width: 768px) {
            .stats-layout { grid-template-columns: repeat(2, 1fr) !important; }
            .section-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
            .date-filter-wrap { width: 100%; flex-wrap: wrap; }
            .date-pill { flex: 1; }
            .search-bar-glass { width: 100% !important; }
            .site-filter-wrap { flex: 1 !important; }
        }
      `}</style>
        </div>
    );
};

export default AdminDashboard;
