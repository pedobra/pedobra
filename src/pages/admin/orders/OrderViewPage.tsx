import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, Trash2, FileDown, History, Building2, User, Sparkles, Package, Clock, AlignLeft } from 'lucide-react';
import { generateOrderPDF } from '../../../lib/generateOrderPDF';
import StandardCard from '../../../components/ui/StandardCard';
import StatusBadge from '../../../components/ui/StatusBadge';

const OrderViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [complementaryOrder, setComplementaryOrder] = useState<any>(null);
    const [parentOrder, setParentOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [priceSuggestions, setPriceSuggestions] = useState<Record<string, { supplierName: string; unitValue: number }>>({});
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [denialReason, setDenialReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) {
            fetchOrder();
            
            const poll = setInterval(fetchOrder, 30000);
            return () => clearInterval(poll);
        }
    }, [id]);

    const getOrderRef = (o: any) => {
        if (!o || !o.created_at) return 'N/A';
        const d = new Date(o.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(o.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    const fetchOrder = async () => {
        const { data } = await supabase.from('orders').select('*, sites(*), profiles(*)').eq('id', id).single();
        if (data) {
            setOrder(data);
            fetchComplementary(data.id);
            if (data.parent_order_id) fetchParent(data.parent_order_id);
            fetchPriceHints(data);
        }
        setLoading(false);
    };

    const fetchParent = async (parentId: string) => {
        const { data } = await supabase.from('orders').select('*').eq('id', parentId).single();
        if (data) setParentOrder(data);
    };

    const fetchComplementary = async (orderId: string) => {
        const { data } = await supabase.from('orders').select('*').eq('parent_order_id', orderId).maybeSingle();
        if (data) setComplementaryOrder(data);
    };

    const fetchPriceHints = async (o: any) => {
        const items = o.items || [];
        if (items.length === 0) return;
        
        try {
            const { data: pastOrders, error: ordersError } = await supabase
                .from('orders')
                .select('items')
                .eq('organization_id', o.organization_id)
                .in('status', ['completed', 'partial'])
                .order('created_at', { ascending: false })
                .limit(500);

            if (ordersError) throw ordersError;

            const bestPrices: Record<string, { unitValue: number; supplierId: string }> = {};
            
            pastOrders?.forEach(order => {
                const orderItems = Array.isArray(order.items) ? order.items : [];
                orderItems.forEach((item: any) => {
                    const price = typeof item.unit_value === 'string' 
                        ? (parseFloat(item.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0)
                        : (item.unit_value || 0);
                    
                    const recQty = parseFloat(item.received_quantity) || 0;
                    
                    if (price > 0 && recQty > 0) {
                        const materialKey = item.material_id || item.name;
                        if (!bestPrices[materialKey] || price < bestPrices[materialKey].unitValue) {
                            bestPrices[materialKey] = { 
                                unitValue: price, 
                                supplierId: item.supplier_id 
                            };
                        }
                    }
                });
            });

            const supplierIds = Array.from(new Set(
                Object.values(bestPrices)
                    .map(bp => bp.supplierId)
                    .filter(id => id && id !== 'other' && id.length > 10)
            ));

            let supplierMap: Record<string, string> = {};
            if (supplierIds.length > 0) {
                const { data: suppliersData } = await supabase
                    .from('suppliers')
                    .select('id, name')
                    .in('id', supplierIds);
                
                suppliersData?.forEach(s => {
                    supplierMap[s.id] = s.name;
                });
            }

            const hints: Record<string, { supplierName: string; unitValue: number }> = {};
            items.forEach((it: any) => {
                const materialKey = it.material_id || it.name;
                const best = bestPrices[materialKey];
                if (best) {
                    hints[it.name] = {
                        unitValue: best.unitValue,
                        supplierName: supplierMap[best.supplierId] || 'Outro'
                    };
                }
            });

            setPriceSuggestions(hints);
        } catch (error) {
            console.error('Error fetching price hints:', error);
        }
    };

    const updateStatus = async (newStatus: string, reason?: string) => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('name').eq('id', user?.id).single();
            const adminName = profile?.name || 'Admin';
            
            let payload: any = { status: newStatus };
            
            if (newStatus === 'approved') {
                payload.approved_by_name = adminName;
                payload.approved_at = new Date().toISOString();
            } else if (newStatus === 'denied') {
                payload.approved_by_name = adminName;
                payload.approved_at = new Date().toISOString();
                payload.denial_reason = reason;
            }
            
            const { error } = await supabase.from('orders').update(payload).eq('id', id);
            if (!error) {
                fetchOrder();
                setShowDenyModal(false);
                setDenialReason('');
            } else {
                console.error('Update error:', error);
                alert('Erro ao atualizar status: ' + error.message);
            }
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Erro inesperado: ' + (err.message || String(err)));
        } finally {
            setProcessing(false);
        }
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
                <div className="view-header-left">
                    <button onClick={() => navigate('/admin/orders')} className="btn-back-circle" title="Voltar para Pedidos">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="header-info">
                        <h1 className="order-title">Pedido {getOrderRef(order)}</h1>
                        <div className="status-container">
                            <StatusBadge status={order.status} />
                        </div>
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
                                    {(order.status === 'completed' || order.status === 'partial') && <th>Valor Unit.</th>}
                                    {order.status === 'new' && <th className="hint-col">Sugestão R$</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {order.items?.map((it: any, i: number) => {
                                    const qty = parseFloat(it.quantity) || 0;
                                    const rec = parseFloat(it.received_quantity) || 0;
                                    const hint = priceSuggestions[it.name];
                                    const unitValue = typeof it.unit_value === 'string' ? (parseFloat(it.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0) : (it.unit_value || 0);

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
                                            {(order.status === 'completed' || order.status === 'partial') && (
                                                <td className="value-cell">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitValue)}
                                                </td>
                                            )}
                                            {order.status === 'new' && (
                                                <td className="hint-cell">
                                                    {hint ? (
                                                        <div className="price-tag-wrapper">
                                                            <div className="price-tag">
                                                                <Sparkles size={10} />
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hint.unitValue)}
                                                            </div>
                                                            <div className="supplier-hint-scroll">
                                                                <span className="sup">({hint.supplierName})</span>
                                                            </div>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {(order.status === 'completed' || order.status === 'partial') && (
                            <div className="order-total-footer">
                                <div className="total-label">VALOR TOTAL DO RECEBIMENTO</div>
                                <div className="total-value">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                        order.items?.reduce((acc: number, it: any) => {
                                            const val = typeof it.unit_value === 'string' ? (parseFloat(it.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0) : (it.unit_value || 0);
                                            const rec = parseFloat(it.received_quantity) || 0;
                                            return acc + (val * rec);
                                        }, 0) || 0
                                    )}
                                </div>
                            </div>
                        )}
                    </StandardCard>

                    {complementaryOrder && (
                        <div className="complementary-box relation-box animate-fade">
                            <div className="comp-header">
                                <History size={16} />
                                <h3>Pedido Complementar Gerado</h3>
                                <StatusBadge status={complementaryOrder.status} />
                            </div>
                            <p>Este pedido foi gerado para suprir os itens não entregues. REF: <strong>{getOrderRef(complementaryOrder)}</strong></p>
                            <button className="btn-text" onClick={() => navigate(`/admin/orders/visualizar/${complementaryOrder.id}`)}>Ver Pedido Complementar →</button>
                        </div>
                    )}

                    {parentOrder && (
                        <div className="parent-box relation-box animate-fade">
                            <div className="comp-header">
                                <History size={16} />
                                <h3>Pedido Original (Base)</h3>
                                <StatusBadge status={parentOrder.status} />
                            </div>
                            <p>Este pedido é um complemento do pedido original. REF: <strong>{getOrderRef(parentOrder)}</strong></p>
                            <button className="btn-text" onClick={() => navigate(`/admin/orders/visualizar/${parentOrder.id}`)}>Ver Pedido de Origem →</button>
                        </div>
                    )}

                    {order.observations && (
                        <div className="observations-display animate-fade">
                            <div className="obs-header">
                                <AlignLeft size={16} />
                                <span>OBSERVAÇÕES DO SOLICITANTE</span>
                            </div>
                            <p className="obs-content">{order.observations}</p>
                        </div>
                    )}

                    {(order.status === 'new' || order.status === 'pending') && (
                        <div className="approval-actions animate-fade">
                            <button className="btn-approve" onClick={() => updateStatus('approved')} disabled={processing}>
                                <CheckCircle size={18} /> Aprovar Solicitação
                            </button>
                            <button className="btn-deny" onClick={() => setShowDenyModal(true)} disabled={processing}>
                                <XCircle size={18} /> Não Autorizar
                            </button>
                        </div>
                    )}

                    <div className="order-timeline-container animate-fade">
                        <div className="timeline-header">
                            <History size={16} />
                            <span>Histórico do Pedido</span>
                        </div>
                        <div className="timeline-horizontal">
                            <div className={`timeline-step ${order.created_at ? 'active' : ''}`}>
                                <div className="step-line"></div>
                                <div className="step-point"></div>
                                <div className="step-info">
                                    <span className="step-label">Solicitado</span>
                                    <span className="step-user">{order.profiles?.name || 'Sistema'}</span>
                                    <span className="step-date">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                    <span className="step-time">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            
                            {(order.approved_at || order.status === 'denied') && (
                                <div className={`timeline-step active ${order.status === 'denied' ? 'denied' : ''}`}>
                                    <div className="step-line"></div>
                                    <div className="step-point"></div>
                                    <div className="step-info">
                                        <span className="step-label">{order.status === 'denied' ? 'Não Autorizado' : 'Aprovado'}</span>
                                        <span className="step-user">{order.approved_by_name || 'Admin'}</span>
                                        {order.status === 'denied' && order.denial_reason && (
                                            <span className="step-reason">"{order.denial_reason}"</span>
                                        )}
                                        <span className="step-date">{order.approved_at ? new Date(order.approved_at).toLocaleDateString('pt-BR') : '-'}</span>
                                        <span className="step-time">{order.approved_at ? new Date(order.approved_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                    </div>
                                </div>
                            )}

                            {(order.status === 'partial' || order.status === 'completed') && (
                                <div className="timeline-step active">
                                    <div className="step-line"></div>
                                    <div className="step-point"></div>
                                    <div className="step-info">
                                        <span className="step-label">
                                            {order.status === 'partial' ? 'Rec. Parcial' : 'Concluído'}
                                        </span>
                                        <span className="step-user">{order.received_by_name || 'Almoxarife'}</span>
                                        <span className="step-date">{order.received_at ? new Date(order.received_at).toLocaleDateString('pt-BR') : '-'}</span>
                                        <span className="step-time">{order.received_at ? new Date(order.received_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="side-info">
                    <StandardCard title="Dados da Solicitação" subtitle="Informações de suporte.">
                        <div className="side-info-container">
                            <div className="info-item-compact">
                                <label><Building2 size={10} /> OBRA</label>
                                <strong>{order.sites?.name}</strong>
                            </div>
                            <div className="info-item-compact">
                                <label><User size={10} /> SOLICITADO POR</label>
                                <strong>{order.profiles?.name}</strong>
                            </div>
                            <div className="info-item-compact">
                                <label><Clock size={10} /> DATA E HORA</label>
                                <strong>{new Date(order.created_at).toLocaleString('pt-BR')}</strong>
                            </div>
                            {order.received_by_name && (
                                <div className="info-item-compact animate-fade">
                                    <label><User size={10} /> RECEBIDO POR</label>
                                    <strong>{order.received_by_name}</strong>
                                </div>
                            )}
                            {order.received_at && (
                                <div className="info-item-compact animate-fade">
                                    <label><Clock size={10} /> DATA DO RECEBIMENTO</label>
                                    <strong>{new Date(order.received_at).toLocaleString('pt-BR')}</strong>
                                </div>
                            )}
                        </div>
                    </StandardCard>
                </div>
            </div>

            {showDenyModal && (
                <div className="modal-overlay animate-fade">
                    <div className="denial-modal animate-slide-up">
                        <div className="denial-header">
                            <XCircle size={24} color="var(--status-denied)" />
                            <h3>Motivo da Não Autorização</h3>
                        </div>
                        <p>Por favor, informe o motivo para não autorizar este pedido. Esta justificativa será visível para o solicitante.</p>
                        <textarea 
                            value={denialReason}
                            onChange={(e) => setDenialReason(e.target.value)}
                            placeholder="Ex: Orçamento excedido para este mês / Material já disponível em estoque..."
                            rows={4}
                        />
                        <div className="denial-actions">
                            <button className="btn-cancel" onClick={() => setShowDenyModal(false)} disabled={processing}>Cancelar</button>
                            <button 
                                className="btn-confirm-deny" 
                                onClick={() => updateStatus('denied', denialReason)}
                                disabled={!denialReason.trim() || processing}
                            >
                                {processing ? 'Processando...' : 'Confirmar Não Autorização'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .order-view-page { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
                .view-header-left { display: flex; align-items: flex-start; gap: 16px; }
                .btn-back-circle { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: var(--text-primary); flex-shrink: 0; }
                .btn-back-circle:hover { background: var(--bg-dark); border-color: var(--text-muted); }
                .header-info { display: flex; flex-direction: column; }
                .order-title { font-size: 24px; font-weight: 850; margin: 0; line-height: 1.2; }
                .status-container { margin-top: 6px; }
                .header-actions { display: flex; gap: 12px; }
                
                .view-grid { display: grid; grid-template-columns: 1fr 280px; gap: 32px; }
                
                .details-table { width: 100%; border-collapse: collapse; }
                .details-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 12px; border-bottom: 1px solid var(--border); }
                .details-table td { padding: 16px 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
                .item-cell { display: flex; align-items: center; gap: 8px; }
                .pending { color: var(--status-pending); font-weight: 700; }
                .done { color: var(--status-approved); }
                .value-cell { font-weight: 700; color: var(--text-primary); }
                
                .order-total-footer { margin-top: 24px; padding: 20px; background: rgba(var(--primary-rgb), 0.05); border: 2px solid var(--border); border-radius: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
                .total-label { font-size: 10px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
                .total-value { font-size: 20px; font-weight: 900; color: var(--primary); }
                
                .hint-cell { text-align: center; }
                .price-tag-wrapper { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .price-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(39,174,96,0.1); color: var(--status-approved); padding: 4px 10px; border-radius: 8px; font-weight: 700; font-family: var(--font-main); white-space: nowrap; }
                .supplier-hint-scroll { max-width: 100%; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px; }
                .supplier-hint-scroll::-webkit-scrollbar { display: none; }
                .sup { font-size: 10px; opacity: 0.7; font-weight: 600; color: var(--text-muted); }
                
                .complementary-box { border-left: 4px solid var(--primary); }
                .parent-box { border-left: 4px solid var(--text-muted); }
                .relation-box { background: var(--bg-card); border: 2px solid var(--border); border-radius: 16px; padding: 24px; margin-top: 24px; }
                .comp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .comp-header h3 { margin: 0; font-size: 16px; flex: 1; }
                .btn-text { background: transparent; border: none; color: var(--primary); padding: 0; cursor: pointer; font-weight: 600; margin-top: 8px; }
                
                .side-info-container { padding: 0 16px; display: flex; flex-direction: column; align-items: center; text-align: center; }
                .info-item-compact { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 0; border-bottom: 1px solid var(--border); }
                .info-item-compact:last-child { border-bottom: none; }
                .info-item-compact label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
                .info-item-compact strong { font-size: 13px; color: var(--text-primary); text-transform: uppercase; display: block; }
                
                .approval-actions { display: flex; flex-direction: column; gap: 12px; margin: 32px auto; max-width: 400px; align-items: stretch; width: 100%; }
                .btn-approve { background: var(--status-approved); color: var(--primary-foreground); border: none; height: 48px; padding: 0 24px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.2s; }
                .btn-approve:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2); }
                .btn-deny { background: transparent; border: 1px solid var(--status-denied); color: var(--status-denied); height: 48px; padding: 0 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.2s; }
                .btn-deny:hover { background: rgba(255, 59, 48, 0.05); transform: translateY(-1px); }

                .observations-display {
                    background: var(--bg-card);
                    border: 2px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                    margin: 24px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .obs-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-muted);
                    font-size: 10px;
                    font-weight: 850;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .obs-content {
                    font-size: 14px;
                    color: var(--text-primary);
                    line-height: 1.6;
                    margin: 0;
                    font-weight: 500;
                }

                /* Timeline Horizontal */
                .order-timeline-container {
                    margin-top: 48px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 24px;
                }
                .timeline-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-muted);
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 32px;
                    letter-spacing: 0.5px;
                }
                .timeline-horizontal {
                    display: flex;
                    justify-content: space-around;
                    align-items: flex-start;
                }
                .timeline-step {
                    position: relative;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .step-point {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--border);
                    border: 2px solid var(--bg-card);
                    z-index: 2;
                    transition: 0.3s;
                }
                .step-line {
                    position: absolute;
                    top: 5px;
                    left: 50%;
                    width: 100%;
                    height: 2px;
                    background: var(--border);
                    z-index: 1;
                }
                .timeline-step:last-child .step-line { display: none; }
                .timeline-step.active .step-point {
                    background: var(--primary);
                    box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.4);
                }
                .timeline-step.active .step-line {
                    background: var(--primary);
                }
                .timeline-step.denied.active .step-point {
                    background: var(--status-denied);
                    box-shadow: 0 0 10px rgba(255, 59, 48, 0.4);
                }
                .timeline-step.denied.active .step-line {
                    background: var(--status-denied);
                }
                
                .step-info {
                    margin-top: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .step-label { font-size: 12px; font-weight: 850; color: var(--text-primary); }
                .step-user { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                .step-date { font-size: 10px; color: var(--text-muted); opacity: 0.8; margin-top: 4px; }
                .step-time { font-size: 10px; color: var(--text-muted); opacity: 0.6; }
                .step-reason { font-size: 12px; color: var(--status-denied); font-weight: 700; margin: 4px 0; background: rgba(255,59,48,0.05); padding: 4px 8px; border-radius: 6px; border: 1px dashed rgba(255,59,48,0.2); }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; padding: 20px;
                }
                .denial-modal {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 24px; padding: 32px; max-width: 500px; width: 100%;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                }
                .denial-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
                .denial-header h3 { margin: 0; font-size: 18px; font-weight: 850; color: var(--text-primary); }
                .denial-modal p { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px; }
                .denial-modal textarea {
                    width: 100%; background: var(--bg-dark); border: 1px solid var(--border);
                    border-radius: 12px; padding: 16px; color: var(--text-primary);
                    font-size: 14px; resize: none; margin-bottom: 24px; outline: none; transition: 0.2s;
                }
                .denial-modal textarea:focus { border-color: var(--status-denied); box-shadow: 0 0 0 4px rgba(255,59,48,0.1); }
                .denial-actions { display: flex; gap: 12px; justify-content: flex-end; }
                .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 12px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }
                .btn-confirm-deny { background: var(--status-denied); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .btn-confirm-deny:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-confirm-deny:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
                
                .btn-ghost.delete:hover { background: rgba(255,59,48,0.1); color: var(--status-denied); border-color: rgba(255,59,48,0.2); }
                .loading-state, .error-state { padding: 100px; text-align: center; color: var(--text-muted); }

                @media (max-width: 1024px) {
                    .view-grid { grid-template-columns: 1fr; gap: 24px; }
                    .view-header { flex-direction: column; align-items: stretch; gap: 16px; }
                    .header-info { width: 100%; }
                    .header-actions { flex-wrap: wrap; width: 100%; justify-content: flex-start; }
                }

                @media (max-width: 768px) {
                    .order-view-page { width: 100%; max-width: 100vw; overflow-x: clip; }
                    
                    /* Tabela Responsiva Sem Scroll Lateral */
                    .details-table { table-layout: fixed; width: 100%; }
                    .details-table th, .details-table td { padding: 8px 4px; font-size: 11px; word-wrap: break-word; overflow-wrap: break-word; }
                    .details-table th { font-size: 9px; letter-spacing: -0.5px; text-align: center; }
                    .item-cell { flex-direction: column; align-items: flex-start; gap: 4px; }
                    .hint-cell { text-align: center; padding-right: 2px; }
                    .hint-col { text-align: center !important; }
                    
                    /* Linha do Tempo Vertical */
                    .order-timeline-container { padding: 20px; }
                    .timeline-horizontal { flex-direction: column; align-items: flex-start; gap: 32px; }
                    .timeline-step { flex-direction: row; text-align: left; width: 100%; gap: 16px; justify-content: flex-start; }
                    .step-info { margin-top: 0; align-items: flex-start; }
                    .step-line { width: 2px; height: calc(100% + 32px); top: 12px; left: 5px; }
                    .timeline-step:last-child .step-line { display: none; }
                }
            `}</style>
        </div>
    );
};

export default OrderViewPage;
