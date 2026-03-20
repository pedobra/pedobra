import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Package,
    LogOut,
    Construction,
    ChevronRight,
    FileText,
    Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const WorkerDashboard = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile?.site_id) {
            fetchOrders();

            // Realtime subscription
            const channel = supabase
                .channel('orders-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `site_id=eq.${profile.site_id}`
                    },
                    () => {
                        fetchOrders();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile]);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, sites(name)')
            .eq('site_id', profile.site_id)
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

    const getStatusClass = (status: string) => {
        const s = status.toLowerCase();
        if (['approved', 'completed', 'active'].includes(s)) return 'highlight-approved';
        if (['new', 'pending', 'partial'].includes(s)) return 'highlight-pending';
        if (['denied', 'cancelled', 'rejected'].includes(s)) return 'highlight-denied';
        return '';
    };

    const filteredOrders = orders.filter(order => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        
        // Ref
        if (getOrderRef(order).toLowerCase().includes(s)) return true;
        
        // Status
        const statusMap: Record<string, string> = {
            'new': 'novo',
            'approved': 'aprovado',
            'denied': 'negado',
            'completed': 'concluído',
            'partial': 'rec. parcial',
            'cancelled': 'cancelado'
        };
        if (statusMap[order.status]?.includes(s)) return true;
        
        // Data
        if (new Date(order.created_at).toLocaleDateString('pt-BR').includes(s)) return true;
        
        // Itens e Valores
        let totalValue = 0;
        const hasItemMatch = order.items?.some((item: any) => {
            const val = (item.unit_value || 0) * (item.quantity || 0);
            totalValue += val;
            return (
                item.name?.toLowerCase().includes(s) ||
                String(item.unit_value).includes(s) ||
                String(item.quantity).includes(s) ||
                val.toFixed(2).replace('.', ',').includes(s)
            );
        });
        
        if (hasItemMatch) return true;
        if (totalValue > 0 && totalValue.toFixed(2).replace('.', ',').includes(s)) return true;
        
        return false;
    });

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <div className="worker-meta">
                    <div className="app-logo"><Construction size={18} color="var(--bg-dark)" /></div>
                    <div className="user-info-text">
                        <strong>{profile?.name}</strong>
                        <span>{profile?.sites?.name || 'Obra não vinculada'}</span>
                    </div>
                </div>
                <button className="logout-mini" onClick={() => supabase.auth.signOut()}>
                    <LogOut size={18} />
                </button>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub">
                    <h1 className="welcome-title">Operações de Campo</h1>
                    <p className="welcome-desc">Gerencie pedidos e recebimentos da sua obra.</p>
                    
                    <div className="hero-actions">
                        <button className="hero-btn primary" onClick={() => navigate('/dashboard/pedir')}>
                            <div className="hero-icon"><Plus size={20} /></div>
                            <span>Novo Pedido</span>
                        </button>
                        <button className="hero-btn secondary" onClick={() => navigate('/dashboard/receipts')}>
                            <div className="hero-icon"><Package size={20} /></div>
                            <span>Recebimento</span>
                        </button>
                    </div>

                    <div className="smart-search-container">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon-fixed" />
                            <input 
                                type="text" 
                                placeholder="Busca inteligente (Nº, Material, Status, Valor...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="smart-search-input"
                            />
                        </div>
                    </div>
                </div>

                <StandardCard title="Pedidos Recentes" subtitle={searchTerm ? `Resultados para "${searchTerm}"` : "Acompanhe o status das solicitações."}>
                    <div className="order-feed">
                        {filteredOrders.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} color="var(--border)" />
                                <p>{searchTerm ? 'Nenhum pedido corresponde à sua busca.' : 'Nenhum pedido realizado nesta obra.'}</p>
                            </div>
                        ) : (
                            filteredOrders.map(order => (
                                <div 
                                    key={order.id} 
                                    className={`order-item-premium ${getStatusClass(order.status)}`} 
                                    onClick={() => navigate(`/dashboard/pedido/${order.id}`)}
                                >
                                    <div className="order-status-line-grid">
                                        <span className="order-ref-text-new">{getOrderRef(order)}</span>
                                        <div className="status-center">
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <div className="order-right-meta-new">
                                            <span className="order-date-new">{new Date(order.created_at).toLocaleDateString()}</span>
                                            <ChevronRight size={16} color="var(--border)" />
                                        </div>
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
                .worker-meta { display: flex; align-items: center; gap: 12px; }
                .app-logo { background: var(--primary); padding: 6px; border-radius: 8px; }
                .user-info-text { display: flex; flex-direction: column; }
                .user-info-text strong { font-size: 14px; font-weight: 800; color: var(--text-primary); }
                .user-info-text span { font-size: 11px; color: var(--text-muted); font-weight: 600; }
                .logout-mini { background: rgba(239, 68, 68, 0.1); color: var(--status-denied); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px; border-radius: 10px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .action-hub { margin-bottom: 32px; }
                .welcome-title { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
                .welcome-desc { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
                
                .hero-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .hero-btn { height: 80px; border-radius: 20px; border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 13px; transition: 0.2s; cursor: pointer; }
                .hero-btn.primary { background: var(--primary); color: var(--bg-dark); border: none; }
                .hero-btn.secondary { background: var(--bg-card); color: var(--text-primary); }
                .hero-btn:active { transform: scale(0.96); }

                .smart-search-container { margin-top: 20px; }
                .search-input-wrapper { position: relative; display: flex; align-items: center; }
                .smart-search-input { width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px 12px 42px; color: var(--text-primary); font-size: 14px; transition: 0.2s; outline: none; }
                .smart-search-input:focus { background: rgba(255, 255, 255, 0.07); border-color: var(--primary); }
                .search-icon-fixed { position: absolute; left: 14px; color: var(--text-muted); pointer-events: none; }
                
                .order-feed { display: flex; flex-direction: column; gap: 8px; }
                .order-item-premium { background: var(--bg-card); padding: 10px 16px; border-radius: 16px; border: 1px solid var(--border); cursor: pointer; transition: 0.2s; }
                .order-item-premium:active { transform: scale(0.98); }

                /* Status Highlights */
                .order-item-premium.highlight-approved { border: 3px solid rgba(16, 185, 129, 0.8); background: rgba(16, 185, 129, 0.05); }
                .order-item-premium.highlight-pending { border: 3px solid rgba(245, 158, 11, 0.8); background: rgba(245, 158, 11, 0.05); }
                .order-item-premium.highlight-denied { border: 3px solid rgba(239, 68, 68, 0.8); background: rgba(239, 68, 68, 0.05); }
                
                .order-item-premium:hover { border-width: 3px; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                
                .order-status-line-grid { display: grid; grid-template-columns: 100px 1fr 100px; align-items: center; }
                .order-ref-text-new { font-size: 14px; font-weight: 850; color: var(--text-primary); text-align: left; white-space: nowrap; }
                .status-center { display: flex; justify-content: center; }
                .status-center .status-badge-container { transform: scale(1.1); background: transparent; border: none; }
                .status-center .status-text { font-size: 13px; font-weight: 800; }
                
                .order-right-meta-new { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
                .order-date-new { font-size: 14px; color: var(--text-primary); font-weight: 850; text-align: right; }
                
                .empty-state { padding: 40px 20px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
            `}</style>
        </div>
    );
};

export default WorkerDashboard;
