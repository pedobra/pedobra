import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    FileText,
    AlignLeft,
    Package
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
                .select('*, sites(name)')
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
                
                .loading-spinner-box, .error-box { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: 700; }
            `}</style>
        </div>
    );
};

export default OrderDetailsPage;
