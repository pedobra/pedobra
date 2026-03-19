import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Package,
    LogOut,
    Construction,
    ChevronRight,
    FileText,
    Send,
    Trash2,
    Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const WorkerDashboard = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [allowCustom, setAllowCustom] = useState(false);

    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({
        material_id: '',
        name: '',
        quantity: '',
        unit: 'un'
    });
    const [isCustom, setIsCustom] = useState(false);
    const [observations, setObservations] = useState('');

    useEffect(() => {
        if (profile?.site_id) {
            fetchOrders();
            fetchMaterials();
            fetchSettings();
        }
    }, [profile]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('allow_custom_materials_global').maybeSingle();
        if (data) setAllowCustom(data.allow_custom_materials_global);
    };

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, sites(name)')
            .eq('site_id', profile.site_id)
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

    const handleAddItem = () => {
        if (!currentItem.quantity || (!currentItem.material_id && !currentItem.name)) return;
        
        let finalItem = { ...currentItem };
        if (!isCustom) {
            const mat = materials.find(m => m.id === currentItem.material_id);
            finalItem.name = mat?.name;
            finalItem.unit = mat?.unit;
        }

        setItems([...items, { ...finalItem, quantity: parseFloat(currentItem.quantity) }]);
        setCurrentItem({ material_id: '', name: '', quantity: '', unit: 'un' });
        setIsCustom(false);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleSubmitOrder = async () => {
        if (items.length === 0) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('orders').insert({
                site_id: profile.site_id,
                user_id: profile.id,
                items,
                observations,
                status: 'new'
            });

            if (error) throw error;
            setItems([]);
            setObservations('');
            setShowModal(false);
            fetchOrders();
            alert('Pedido enviado com sucesso!');
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <button className="hero-btn primary" onClick={() => setShowModal(true)}>
                            <div className="hero-icon"><Plus size={24} /></div>
                            <span>Novo Pedido</span>
                        </button>
                        <button className="hero-btn secondary" onClick={() => navigate('/receiving')}>
                            <div className="hero-icon"><Package size={24} /></div>
                            <span>Recebimento</span>
                        </button>
                    </div>
                </div>

                <StandardCard title="Pedidos Recentes" subtitle="Acompanhe o status das solicitações.">
                    <div className="order-feed">
                        {orders.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} color="var(--border)" />
                                <p>Nenhum pedido realizado nesta obra.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="order-item-premium" onClick={() => setViewingOrder(order)}>
                                    <div className="order-status-line">
                                        <StatusBadge status={order.status} />
                                        <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="order-main">
                                        <div className="order-materials">
                                            {order.items.slice(0, 2).map((it: any, i: number) => (
                                                <span key={i}>{it.name}{i < 1 && order.items.length > 1 ? ', ' : ''}</span>
                                            ))}
                                            {order.items.length > 2 && <span className="more">+{order.items.length - 2} itens</span>}
                                        </div>
                                        <ChevronRight size={18} color="var(--border)" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </StandardCard>
            </main>

            {/* Modal: Novo Pedido */}
            {showModal && (
                <div className="modal-overlay-worker glass" onClick={() => setShowModal(false)}>
                    <div className="worker-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle" />
                        <div className="sheet-header">
                            <h2>Solicitar Materiais</h2>
                            <p>Adicione os itens necessários para a obra.</p>
                        </div>

                        <div className="sheet-body">
                            <div className="item-selector-box">
                                <div className="search-bar-mini">
                                    <Search size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar no catálogo..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="materials-grid-mini">
                                    {filteredMaterials.slice(0, 6).map(m => (
                                        <button 
                                            key={m.id} 
                                            className={`mat-chip ${currentItem.material_id === m.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setCurrentItem({ ...currentItem, material_id: m.id, name: m.name, unit: m.unit });
                                                setIsCustom(false);
                                            }}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                    {allowCustom && (
                                        <button 
                                            className={`mat-chip outline ${isCustom ? 'active' : ''}`}
                                            onClick={() => {
                                                setIsCustom(true);
                                                setCurrentItem({ ...currentItem, material_id: '', name: '' });
                                            }}
                                        >
                                            + Outro item
                                        </button>
                                    )}
                                </div>

                                {isCustom && (
                                    <input 
                                        type="text" 
                                        className="worker-input" 
                                        placeholder="Nome do material..." 
                                        value={currentItem.name}
                                        onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                                    />
                                )}

                                <div className="qty-row">
                                    <input 
                                        type="number" 
                                        className="worker-input qty" 
                                        placeholder="Qtd" 
                                        value={currentItem.quantity}
                                        onChange={e => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                                    />
                                    <button className="btn-add-item" onClick={handleAddItem}>Adicionar</button>
                                </div>
                            </div>

                            <div className="added-items-list">
                                {items.map((it, idx) => (
                                    <div key={idx} className="added-item">
                                        <span>{it.quantity}{it.unit} • {it.name}</span>
                                        <button onClick={() => handleRemoveItem(idx)}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>

                            <textarea 
                                className="worker-textarea" 
                                placeholder="Observações adicionais..."
                                value={observations}
                                onChange={e => setObservations(e.target.value)}
                            />
                        </div>

                        <div className="sheet-footer">
                            <button className="btn-primary" onClick={handleSubmitOrder} disabled={loading || items.length === 0}>
                                <Send size={18} /> {loading ? 'Enviando...' : 'Enviar Pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detalhes do Pedido */}
            {viewingOrder && (
                <div className="modal-overlay-worker glass" onClick={() => setViewingOrder(null)}>
                    <div className="worker-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle" />
                        <div className="sheet-header">
                            <div className="status-badge-row">
                                <StatusBadge status={viewingOrder.status} />
                                <span>#{viewingOrder.id?.slice(0, 8)}</span>
                            </div>
                            <h2>Detalhes do Pedido</h2>
                            <p>Realizado em {new Date(viewingOrder.created_at).toLocaleDateString()}</p>
                        </div>

                        <div className="sheet-body">
                            <div className="view-items-list">
                                {viewingOrder.items.map((it: any, idx: number) => (
                                    <div key={idx} className="view-item">
                                        <div className="item-dot" />
                                        <div className="item-info">
                                            <strong>{it.name}</strong>
                                            <span>{it.quantity} {it.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {viewingOrder.observations && (
                                <div className="view-obs">
                                    <label>Observações</label>
                                    <p>{viewingOrder.observations}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                .hero-btn { height: 120px; border-radius: 24px; border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; font-weight: 800; font-size: 14px; transition: 0.2s; }
                .hero-btn.primary { background: var(--primary); color: var(--bg-dark); border: none; }
                .hero-btn.secondary { background: var(--bg-card); color: var(--text-primary); }
                .hero-icon { opacity: 0.8; }
                
                .order-feed { display: flex; flex-direction: column; gap: 10px; }
                .order-item-premium { background: var(--bg-dark); padding: 16px; border-radius: 16px; border: 1px solid var(--border); cursor: pointer; }
                .order-status-line { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .order-date { font-size: 11px; color: var(--text-muted); font-weight: 700; }
                .order-main { display: flex; justify-content: space-between; align-items: center; }
                .order-materials { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
                .order-materials .more { color: var(--primary); margin-left: 4px; }
                
                .modal-overlay-worker { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; }
                .worker-sheet { width: 100%; background: var(--bg-card); border-radius: 32px 32px 0 0; padding: 24px; padding-top: 12px; border: 1px solid var(--border); border-bottom: none; display: flex; flex-direction: column; max-height: 85vh; }
                .sheet-handle { width: 40px; height: 4px; background: var(--border); border-radius: 20px; margin: 0 auto 20px; }
                .sheet-header h2 { font-size: 20px; font-weight: 850; margin-bottom: 4px; }
                .sheet-header p { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; }
                
                .item-selector-box { background: var(--bg-dark); padding: 16px; border-radius: 16px; border: 1px solid var(--border); margin-bottom: 16px; }
                .search-bar-mini { display: flex; align-items: center; gap: 8px; background: var(--bg-input); padding: 0 12px; height: 40px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; }
                .search-bar-mini input { background: transparent; border: none; color: var(--text-primary); width: 100%; outline: none; font-size: 13px; }
                
                .materials-grid-mini { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
                .mat-chip { padding: 8px 14px; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border); font-size: 12px; font-weight: 700; color: var(--text-secondary); }
                .mat-chip.active { background: var(--primary); color: var(--bg-dark); border-color: var(--primary); }
                .mat-chip.outline { border-style: dashed; }
                
                .qty-row { display: flex; gap: 8px; margin-top: 12px; }
                .worker-input { background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; height: 44px; padding: 0 16px; color: var(--text-primary); outline: none; font-size: 14px; width: 100%; }
                .worker-input.qty { width: 80px; text-align: center; }
                .btn-add-item { background: var(--text-primary); color: var(--bg-dark); border: none; border-radius: 12px; padding: 0 16px; font-weight: 800; font-size: 13px; }
                
                .added-items-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; min-height: 0; max-height: 420px; overflow-y: auto; }
                .added-item { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 10px 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: var(--primary); }
                .added-item button { color: var(--status-denied); background: transparent; border: none; font-size: 14px; padding: 4px; font-weight: bold; }
                
                .worker-textarea { width: 100%; min-height: 80px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); outline: none; font-size: 14px; margin-top: 12px; resize: none; }
                
                .sheet-footer { padding-top: 20px; }
                .btn-primary { width: 100%; height: 52px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; }
                
                .view-items-list { display: flex; flex-direction: column; gap: 14px; margin-top: 10px; }
                .view-item { display: flex; align-items: flex-start; gap: 12px; }
                .item-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); margin-top: 7px; flex-shrink: 0; }
                .item-info { display: flex; flex-direction: column; }
                .item-info strong { font-size: 14px; color: var(--text-primary); }
                .item-info span { font-size: 12px; color: var(--text-muted); font-weight: 600; }
            `}</style>
        </div>
    );
};

export default WorkerDashboard;
