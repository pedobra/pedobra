import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    FileText,
    AlignLeft,
    Package,
    History
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import StandardCard from '../../components/ui/StandardCard';

const OrderDetailsPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, sites(name), profiles(name)')
                .eq('id', id)
                .single();
            if (error) throw error;
            setOrder(data);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    if (loading) return <div className="loading-spinner-box">Carregando detalhes...</div>;
    if (!order) return <div className="error-box">Pedido não encontrado.</div>;

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ChevronLeft size={20} />
                    <span>Pedidos</span>
                </button>
                <div className="worker-meta">
                    <div className="app-logo"><FileText size={18} color="var(--bg-dark)" /></div>
                    <strong>Detalhes</strong>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="order-details-header">
                    <h1 className="welcome-title">Informações do Pedido {getOrderRef(order)}</h1>
                </div>

                <div className="details-grid-worker">
                    <StandardCard title="Itens Pedidos" subtitle="Materiais e quantidades solicitadas.">
                        <div className="view-items-list-page">
                            {order.items.map((it: any, idx: number) => (
                                <div key={idx} className="view-item-card">
                                    <div className="item-icon-box">
                                        <Package size={20} />
                                    </div>
                                    <div className="item-txt">
                                        <strong>{it.name}</strong>
                                        <span>{it.quantity} {it.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </StandardCard>

                    <div className="info-cards-stack">
                        <div className="mini-info-card status-date">
                            <div className="mic-txt">
                                <label>STATUS E DATA</label>
                                <div className="prominent-status-row">
                                    <StatusBadge status={order.status} />
                                    <span className="big-date">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>
                        {order.observations && (
                            <div className="mini-info-card obs">
                                <AlignLeft size={16} />
                                <div className="mic-txt">
                                    <label>OBSERVAÇÕES</label>
                                    <p>{order.observations}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="order-timeline-container animate-fade">
                        <div className="timeline-header">
                            <History size={16} />
                            <span>Histórico do Pedido</span>
                        </div>
                        <div className="timeline-horizontal">
                            <div className={`timeline-step ${order.created_at ? 'active' : ''}`}>
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
            </main>

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 40px; }
                .app-header { position: fixed; top: 0; left: 0; right: 0; height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid var(--border); }
                .back-btn { background: transparent; border: none; color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
                .worker-meta { display: flex; align-items: center; gap: 10px; font-size: 14px; }
                .app-logo { background: var(--primary); padding: 5px; border-radius: 6px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .order-details-header { margin-bottom: 24px; }
                .status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .ref-pill { font-size: 11px; font-weight: 800; color: var(--primary); background: rgba(39, 201, 140, 0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(39, 201, 140, 0.2); }
                .welcome-title { font-size: 24px; font-weight: 850; }
                
                .view-items-list-page { display: flex; flex-direction: column; gap: 12px; }
                .view-item-card { background: var(--bg-dark); padding: 16px; border-radius: 16px; border: 1px solid var(--border); display: flex; align-items: center; gap: 16px; }
                .item-icon-box { width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
                .item-txt { display: flex; flex-direction: column; }
                .item-txt strong { font-size: 15px; color: var(--text-primary); }
                .item-txt span { font-size: 13px; color: var(--text-muted); font-weight: 600; }
                
                .info-cards-stack { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
                .mini-info-card { background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); display: flex; align-items: flex-start; gap: 14px; color: var(--text-muted); }
                .mini-info-card.obs { flex-direction: column; gap: 8px; }
                .mic-txt { display: flex; flex-direction: column; gap: 8px; width: 100%; }
                .prominent-status-row { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
                .big-date { font-size: 16px; font-weight: 900; color: var(--text-primary); }
                .mic-txt label { font-size: 10px; font-weight: 800; letter-spacing: 1px; opacity: 0.8; color: var(--text-muted); text-transform: uppercase; }
                .mic-txt p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0; }

                /* Timeline Horizontal */
                .order-timeline-container {
                    margin-top: 32px;
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
                    right: 50%;
                    width: 100%;
                    height: 2px;
                    background: var(--border);
                    z-index: 1;
                }
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
                
                .loading-spinner-box, .error-box { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: 700; }
            `}</style>
        </div>
    );
};

export default OrderDetailsPage;
