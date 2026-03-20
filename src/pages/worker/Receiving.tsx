import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, ChevronLeft, PackageCheck, Archive, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StandardCard from '../../components/ui/StandardCard';

const WorkerReceiving = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        if (profile) {
            fetchOrders();
        }
    }, [profile]);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, sites(name, address), profiles(name)')
            .eq('site_id', profile.site_id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ChevronLeft size={20} />
                    <span>Início</span>
                </button>
                <div className="worker-meta">
                    <div className="app-logo"><Archive size={18} color="var(--bg-dark)" /></div>
                    <strong>Recebimento</strong>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub">
                    <h1 className="welcome-title">Cargas & Entregas</h1>
                    <p className="welcome-desc">Confirme a chegada de materiais no canteiro.</p>
                </div>

                <StandardCard title="Pedidos para Receber" subtitle="Apenas pedidos aprovados pelo financeiro.">
                    <div className="receiving-list">
                        {orders.length === 0 ? (
                            <div className="empty-state">
                                <PackageCheck size={48} color="var(--border)" />
                                <p>Tudo em dia! Sem entregas pendentes.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="receiving-card-premium" onClick={() => navigate(`/dashboard/receipts/${order.id}`)}>
                                    <div className="card-top">
                                        <div className="ref-info">
                                            <span className="ref-text">REF: {getOrderRef(order)}</span>
                                            <div className="badge-items">
                                                <Package size={12} />
                                                <span>{order.items.length} itens</span>
                                            </div>
                                        </div>
                                        <div className="icon-arrow"><ChevronRight size={18} /></div>
                                    </div>
                                    <div className="card-footer">
                                        <span className="date-text">Aprovado em {new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </StandardCard>
            </main>

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 40px; }
                .app-header { position: fixed; top: 0; left: 0; right: 0; height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid var(--border); }
                .back-btn { background: transparent; border: none; color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; cursor: pointer; }
                .worker-meta { display: flex; align-items: center; gap: 10px; font-size: 14px; }
                .app-logo { background: var(--primary); padding: 5px; border-radius: 6px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .welcome-title { font-size: 24px; font-weight: 800; }
                .welcome-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }
                
                .receiving-list { display: flex; flex-direction: column; gap: 12px; }
                .empty-state { padding: 60px 20px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
                
                .receiving-card-premium { background: var(--bg-dark); padding: 20px; border-radius: 18px; border: 1px solid var(--border); cursor: pointer; transition: 0.2s; }
                .receiving-card-premium:active { border-color: var(--primary); transform: scale(0.98); }
                .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .ref-info { display: flex; flex-direction: column; gap: 4px; }
                .ref-text { font-family: var(--font-main); font-weight: 700; color: var(--primary); font-size: 14px; }
                .badge-items { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
                .icon-arrow { color: var(--border); }
                .card-footer { padding-top: 12px; border-top: 1px solid var(--border); }
                .date-text { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
            `}</style>
        </div>
    );
};

export default WorkerReceiving;
