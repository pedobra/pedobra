import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, ChevronLeft, PackageCheck, Send, Archive, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StandardCard from '../../components/ui/StandardCard';

const WorkerReceiving = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [editingItems, setEditingItems] = useState<any[]>([]);

    useEffect(() => {
        if (profile) {
            fetchOrders();
            fetchSuppliers();
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

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').order('name');
        if (data) setSuppliers(data);
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    const handleOpenOrder = (order: any) => {
        setViewingOrder(order);
        setEditingItems((order.items || []).map((item: any) => ({
            ...item,
            received_quantity: item.received_quantity || '',
            unit_value: item.unit_value || '',
            supplier_id: item.supplier_id || ''
        })));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...editingItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditingItems(newItems);
    };

    const handleSaveReceiving = async () => {
        setLoading(true);
        try {
            const finalEditingItems = editingItems.map(i => ({
                ...i, 
                received_quantity: parseFloat(i.received_quantity) || 0,
                unit_value: parseFloat(i.unit_value) || 0
            }));

            const isPartial = finalEditingItems.some(i => i.received_quantity < i.quantity);
            const finalStatus = isPartial ? 'partial' : 'completed';

            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    items: finalEditingItems, 
                    status: finalStatus,
                    received_at: new Date().toISOString(),
                    received_by_name: profile?.name || 'Encarregado'
                })
                .eq('id', viewingOrder.id);

            if (updateError) throw updateError;

            if (isPartial) {
                const missingItems = finalEditingItems
                    .filter(i => i.received_quantity < i.quantity)
                    .map(i => ({
                        material_id: i.material_id,
                        name: `[COMPLEMENTO REF ${getOrderRef(viewingOrder)}] ${i.name}`,
                        quantity: i.quantity - i.received_quantity,
                        unit: i.unit
                    }));

                if (missingItems.length > 0) {
                    await supabase.from('orders').insert({
                        site_id: viewingOrder.site_id,
                        user_id: viewingOrder.user_id,
                        items: missingItems,
                        status: 'new'
                    });
                }
            }

            fetchOrders();
            setViewingOrder(null);
            alert('Recebimento registrado!');
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
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
                                <div key={order.id} className="receiving-card-premium" onClick={() => handleOpenOrder(order)}>
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

            {viewingOrder && (
                <div className="modal-overlay-worker glass" onClick={() => setViewingOrder(null)}>
                    <div className="worker-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle" />
                        <div className="sheet-header-box">
                            <h2>Baixa de Materiais</h2>
                            <p>REF: {getOrderRef(viewingOrder)} • {viewingOrder.sites?.name}</p>
                        </div>

                        <div className="receiving-items-scroll">
                            {editingItems.map((item: any, idx: number) => (
                                <div key={idx} className="receiving-item-box">
                                    <div className="item-title-row">
                                        <strong>{item.name}</strong>
                                        <span className="req-qty">Sol: {item.quantity} {item.unit}</span>
                                    </div>
                                    <div className="inputs-grid">
                                        <div className="input-field">
                                            <label>Qtd Recebida</label>
                                            <input type="number" value={item.received_quantity} onChange={e => handleItemChange(idx, 'received_quantity', e.target.value)} placeholder="0" />
                                        </div>
                                        <div className="input-field">
                                            <label>Valor Unit. (R$)</label>
                                            <input type="number" step="0.01" value={item.unit_value} onChange={e => handleItemChange(idx, 'unit_value', e.target.value)} placeholder="0,00" />
                                        </div>
                                    </div>
                                    <div className="input-field full">
                                        <label>Fornecedor</label>
                                        <select value={item.supplier_id} onChange={e => handleItemChange(idx, 'supplier_id', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                            <option value="other">Outro / Avulso</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sheet-footer">
                            <button className="btn-primary large" onClick={handleSaveReceiving} disabled={loading}>
                                <Send size={18} /> {loading ? 'Salvando...' : 'Confirmar Entrega'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 40px; }
                .app-header { position: fixed; top: 0; left: 0; right: 0; height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid var(--border); }
                .back-btn { background: transparent; border: none; color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
                .worker-meta { display: flex; align-items: center; gap: 10px; font-size: 14px; }
                .app-logo { background: var(--primary); padding: 5px; border-radius: 6px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .welcome-title { font-size: 24px; font-weight: 800; }
                .welcome-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }
                
                .receiving-list { display: flex; flex-direction: column; gap: 12px; }
                .empty-state { padding: 60px 20px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
                
                .receiving-card-premium { background: var(--bg-dark); padding: 20px; border-radius: 18px; border: 1px solid var(--border); cursor: pointer; transition: 0.2s; }
                .receiving-card-premium:active { border-color: var(--primary); }
                .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .ref-info { display: flex; flex-direction: column; gap: 4px; }
                .ref-text { font-family: var(--font-main); font-weight: 700; color: var(--primary); font-size: 14px; }
                .badge-items { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
                .icon-arrow { color: var(--border); }
                .card-footer { padding-top: 12px; border-top: 1px solid var(--border); }
                .date-text { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
                
                .modal-overlay-worker { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; }
                .worker-sheet { width: 100%; background: var(--bg-card); border-radius: 32px 32px 0 0; padding: 24px; padding-top: 12px; border: 1px solid var(--border); border-bottom: none; display: flex; flex-direction: column; max-height: 94vh; }
                .sheet-handle { width: 40px; height: 4px; background: var(--border); border-radius: 20px; margin: 0 auto 20px; flex-shrink: 0; }
                .sheet-header-box { margin-bottom: 24px; flex-shrink: 0; }
                .sheet-header-box h2 { font-size: 20px; font-weight: 800; }
                .sheet-header-box p { font-size: 12px; color: var(--text-muted); }
                
                .receiving-items-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding-bottom: 24px; }
                .receiving-item-box { background: var(--bg-dark); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
                .item-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .item-title-row strong { font-size: 14px; }
                .req-qty { font-size: 12px; color: var(--primary); font-family: var(--font-main); font-weight: 700; }
                
                .inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
                .input-field { display: flex; flex-direction: column; gap: 4px; }
                .input-field label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
                .input-field input, .input-field select { width: 100%; height: 44px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); padding: 0 12px; outline: none; font-size: 14px; }
                
                .sheet-footer { padding-top: 16px; border-top: 1px solid var(--border); flex-shrink: 0; }
                .btn-primary.large { width: 100%; height: 56px; border-radius: 16px; font-weight: 800; }
            `}</style>
        </div>
    );
};

export default WorkerReceiving;
