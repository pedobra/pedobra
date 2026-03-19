import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, Trash2, FileDown, History, Building2, User, Sparkles, Package, Clock } from 'lucide-react';
import { generateOrderPDF } from '../../../lib/generateOrderPDF';
import StandardCard from '../../../components/ui/StandardCard';
import StatusBadge from '../../../components/ui/StatusBadge';

const OrderViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [complementaryOrder, setComplementaryOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [priceSuggestions, setPriceSuggestions] = useState<Record<string, { supplierName: string; unitValue: number }>>({});

    useEffect(() => {
        if (id) fetchOrder();
    }, [id]);

    const getOrderRef = (o: any) => {
        if (!o || !o.created_at) return 'N/A';
        const d = new Date(o.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(o.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    const fetchOrder = async () => {
        const { data } = await supabase.from('orders').select('*, sites(*), profiles(*)').eq('id', id).single();
        if (data) {
            setOrder(data);
            fetchComplementary(data);
            fetchPriceHints(data);
        }
        setLoading(false);
    };

    const fetchComplementary = async (baseOrder: any) => {
        const ref = getOrderRef(baseOrder);
        const { data } = await supabase.from('orders').select('*').contains('items', [{ name: `[COMPLEMENTO REF ${ref}]` }]).single();
        if (data) setComplementaryOrder(data);
    };

    const fetchPriceHints = async (o: any) => {
        const items = o.items || [];
        if (items.length === 0) return;
        
        // If not pending, items already have hints
        if (o.status !== 'new' && o.status !== 'pending') {
             const hints: any = {};
             items.forEach((it: any) => {
                 if (it.price_hint) hints[it.name] = { supplierName: it.price_hint_supplier, unitValue: it.price_hint };
             });
             setPriceSuggestions(hints);
             return;
        }

        // ... (Logic to fetch recent best prices)
    };

    const updateStatus = async (newStatus: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        let payload: any = { status: newStatus };
        if (newStatus === 'approved') {
            const { data: profile } = await supabase.from('profiles').select('name').eq('id', user?.id).single();
            payload.approved_by_name = profile?.name || 'Admin';
            payload.approved_at = new Date().toISOString();
        }
        const { error } = await supabase.from('orders').update(payload).eq('id', id);
        if (!error) fetchOrder();
    };

    const handleDelete = async () => {
        if (!window.confirm('Excluir este pedido permanentemente?')) return;
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) navigate('/admin/orders');
    };

    if (loading) return <div className="loading-state">Carregando detalhes...</div>;
    if (!order) return <div className="error-state">Pedido não encontrado.</div>;

    return (
        <div className="order-view-page">
            <header className="view-header">
                <button onClick={() => navigate('/admin/orders')} className="btn-back">
                    <ArrowLeft size={18} /> Painel de Pedidos
                </button>
                <div className="header-info">
                    <h1 className="page-title">Pedido #{getOrderRef(order)}</h1>
                    <div className="status-container">
                        <StatusBadge status={order.status} />
                    </div>
                </div>
                <div className="header-actions">
                   <button className="btn-ghost" onClick={() => generateOrderPDF(order, order.profiles?.name || 'Admin')}>
                       <FileDown size={18} /> Exportar PDF
                   </button>
                   <button className="btn-ghost delete" onClick={handleDelete}>
                       <Trash2 size={18} /> Excluir
                   </button>
                </div>
            </header>

            <div className="view-grid">
                <div className="main-info">
                    <StandardCard title="Itens Solicitados" subtitle="Insumos e quantidades para a obra.">
                        <table className="details-table">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Qtd Solicitada</th>
                                    <th>Recebido</th>
                                    {order.status === 'new' && <th className="hint-col">Sugestão R$</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {order.items?.map((it: any, i: number) => {
                                    const qty = parseFloat(it.quantity) || 0;
                                    const rec = parseFloat(it.received_quantity) || 0;
                                    const hint = priceSuggestions[it.name];
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <div className="item-cell">
                                                    <Package size={14} />
                                                    <strong>{it.name}</strong>
                                                </div>
                                            </td>
                                            <td>{qty} {it.unit}</td>
                                            <td className={rec < qty ? 'pending' : 'done'}>{rec} {it.unit}</td>
                                            {order.status === 'new' && (
                                                <td className="hint-cell">
                                                    {hint ? (
                                                        <div className="price-tag">
                                                            <Sparkles size={10} />
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hint.unitValue)}
                                                            <span className="sup">({hint.supplierName})</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </StandardCard>

                    {complementaryOrder && (
                        <div className="complementary-box animate-fade">
                            <div className="comp-header">
                                <History size={16} />
                                <h3>Pedido Complementar Gerado</h3>
                                <StatusBadge status={complementaryOrder.status} />
                            </div>
                            <p>Este pedido foi gerado automaticamente devido a itens não entregues. REF: <strong>#{getOrderRef(complementaryOrder)}</strong></p>
                            <button className="btn-text" onClick={() => navigate(`/admin/orders/visualizar/${complementaryOrder.id}`)}>Ver Pedido Complementar →</button>
                        </div>
                    )}
                </div>

                <div className="side-info">
                    <StandardCard title="Dados da Solicitação" subtitle="Informações de suporte.">
                        <div className="info-item">
                            <label><Building2 size={12} /> Canteiro</label>
                            <strong>{order.sites?.name}</strong>
                        </div>
                        <div className="info-item">
                            <label><User size={12} /> Solicitado Por</label>
                            <strong>{order.profiles?.name}</strong>
                        </div>
                        <div className="info-item">
                            <label><Clock size={12} /> Data/Hora</label>
                            <strong>{new Date(order.created_at).toLocaleString('pt-BR')}</strong>
                        </div>
                    </StandardCard>

                    {(order.status === 'new' || order.status === 'pending') && (
                        <div className="approval-actions animate-fade">
                            <button className="btn-approve" onClick={() => updateStatus('approved')}>
                                <CheckCircle size={18} /> Aprovar Solicitação
                            </button>
                            <button className="btn-deny" onClick={() => updateStatus('denied')}>
                                <XCircle size={18} /> Negar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .order-view-page { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; align-items: center; gap: 24px; }
                .header-info { flex: 1; }
                .status-container { margin-top: 8px; }
                .view-grid { display: grid; grid-template-columns: 1fr 320px; gap: 32px; }
                
                .details-table { width: 100%; border-collapse: collapse; }
                .details-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 12px; border-bottom: 1px solid var(--border); }
                .details-table td { padding: 16px 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
                .item-cell { display: flex; align-items: center; gap: 8px; }
                .pending { color: var(--status-pending); font-weight: 700; }
                .done { color: var(--status-approved); }
                
                .price-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(39,174,96,0.1); color: #27ae60; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-family: monospace; }
                .sup { font-size: 10px; opacity: 0.7; font-weight: 400; margin-left: 4px; }
                
                .complementary-box { background: var(--bg-card); border: 2px solid var(--border); border-left: 4px solid var(--primary); border-radius: 16px; padding: 24px; margin-top: 24px; }
                .comp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .comp-header h3 { margin: 0; font-size: 16px; flex: 1; }
                .btn-text { background: transparent; border: none; color: var(--primary); padding: 0; cursor: pointer; font-weight: 600; margin-top: 8px; }
                
                .info-item { margin-bottom: 20px; }
                .info-item label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
                .info-item strong { font-size: 16px; color: var(--text-primary); }
                
                .approval-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
                .btn-approve { background: #34C759; color: white; border: none; height: 44px; padding: 0 16px; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
                .btn-deny { background: transparent; border: 1px solid #FF3B30; color: #FF3B30; height: 44px; padding: 0 16px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
                
                .btn-ghost.delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }
                .loading-state, .error-state { padding: 100px; text-align: center; color: var(--text-muted); }
            `}</style>
        </div>
    );
};

export default OrderViewPage;
