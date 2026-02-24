import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, ChevronLeft, CheckCircle, PackageCheck, Send, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        // Fetch approved orders for the user's site
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
            let numReceived = 0;
            let numRequests = 0;
            const finalEditingItems = editingItems.map(i => {
                const recQty = parseFloat(i.received_quantity) || 0;
                const reqQty = parseFloat(i.quantity) || 0;
                numReceived += recQty;
                numRequests += reqQty;
                return { ...i, received_quantity: recQty };
            });

            // Note: If no quantities entered at all, it's just 'approved'. but we assume they entered something.
            // Requirement from User: "Se as quantidades recebidas forem menor do que as solicitadas, em qualquer item..."
            const isPartial = finalEditingItems.some(i => (parseFloat(i.received_quantity as string) || 0) < parseFloat(i.quantity as string));
            const finalStatus = isPartial ? 'partial' : 'completed';

            const updatePayload: any = { items: finalEditingItems, status: finalStatus };
            updatePayload.received_at = new Date().toISOString();
            updatePayload.received_by_name = profile?.name || 'Encarregado / Mestre de Obras';

            const { data: updatedData, error: updateError } = await supabase
                .from('orders')
                .update(updatePayload)
                .eq('id', viewingOrder.id)
                .select();

            if (updateError) throw updateError;
            if (!updatedData || updatedData.length === 0) {
                throw new Error("O recebimento não foi salvo. Verifique as políticas de segurança (RLS) da tabela 'orders' no Supabase para permitir UPDATE aos usuários.");
            }

            if (isPartial) {
                const missingItems = finalEditingItems
                    .filter(i => (parseFloat(i.received_quantity as string) || 0) < parseFloat(i.quantity as string))
                    .map(i => {
                        const recQty = parseFloat(i.received_quantity as string) || 0;
                        const reqQty = parseFloat(i.quantity as string) || 0;
                        return {
                            material_id: i.material_id,
                            name: `[COMPLEMENTO REF ${getOrderRef(viewingOrder)}] ${i.name}`,
                            quantity: reqQty - recQty,
                            unit: i.unit,
                            received_quantity: null,
                            unit_value: null,
                            supplier_id: null
                        };
                    });

                if (missingItems.length > 0) {
                    const { error: insertError } = await supabase.from('orders').insert({
                        site_id: viewingOrder.site_id,
                        user_id: viewingOrder.user_id,
                        items: missingItems,
                        status: 'new'
                    });
                    if (insertError) throw insertError;
                }
            }

            fetchOrders();
            setViewingOrder(null);
            alert('Recebimento registrado com sucesso!');
        } catch (err: any) {
            alert('Erro ao registrar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ChevronLeft size={24} />
                    <span>Voltar</span>
                </button>
                <div className="worker-meta">
                    <div className="app-logo">
                        <Archive size={20} color="var(--bg-dark)" />
                    </div>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub" style={{ marginBottom: '24px' }}>
                    <h1 className="welcome-title">Recebimento</h1>
                    <p className="welcome-desc">Registre a entrega dos insumos nas obras.</p>
                </div>

                <section className="history-section">
                    <div className="section-title-row">
                        <div className="title-with-icon">
                            <CheckCircle size={18} color="var(--status-approved)" />
                            <h2>Pedidos Aprovados</h2>
                        </div>
                        <span className="count-badge">{orders.length}</span>
                    </div>

                    <div className="order-list">
                        {orders.length === 0 ? (
                            <div className="premium-card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Nenhum pedido aprovado pendente de recebimento.
                            </div>
                        ) : (
                            orders.map(order => {
                                const totalItems = order.items?.length || 0;
                                const itemsReceived = order.items?.filter((i: any) => i.received_quantity).length || 0;

                                return (
                                    <div key={order.id} className="order-card-compact premium-card" onClick={() => handleOpenOrder(order)} style={{ cursor: 'pointer' }}>
                                        <div className="order-main">
                                            <div className="order-info">
                                                <span className="order-id">REF: {getOrderRef(order)}</span>
                                                <div className="item-count">
                                                    <Package size={14} />
                                                    <span>{order.items.length} itens no pedido</span>
                                                </div>
                                            </div>
                                            <div className="status-icon-box approved" style={{ background: itemsReceived === totalItems ? 'rgba(52, 199, 89, 0.1)' : 'var(--primary-glow)', color: itemsReceived === totalItems ? 'var(--status-approved)' : 'var(--primary)' }}>
                                                {itemsReceived === totalItems ? <PackageCheck size={20} /> : <Archive size={20} />}
                                            </div>
                                        </div>
                                        <div className="order-footer">
                                            <span className="order-date">Aprovado em {new Date(order.created_at).toLocaleDateString()}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: itemsReceived === totalItems ? 'var(--status-approved)' : 'var(--primary)' }}>
                                                {itemsReceived} de {totalItems} recebidos
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>

            {viewingOrder && (
                <div className="modal-overlay-mobile glass" onClick={() => setViewingOrder(null)}>
                    <div className="mobile-sheet premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle"></div>
                        <div className="sheet-header">
                            <h2>Recebimento de Insumos</h2>
                            <p>REF: {getOrderRef(viewingOrder)} • {viewingOrder.sites?.name}</p>
                        </div>

                        <div className="items-preview-list" style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                            {editingItems.map((item: any, idx: number) => (
                                <div key={idx} style={{ background: 'var(--bg-glass)', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <strong style={{ fontSize: '15px' }}>{item.name}</strong>
                                        <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold' }}>Sol: {item.quantity} {item.unit || 'un'}</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>QTDE. RECEBIDA</label>
                                            <input
                                                type="number"
                                                value={item.received_quantity}
                                                onChange={e => handleItemChange(idx, 'received_quantity', e.target.value)}
                                                placeholder="0"
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>VALOR UNIT. (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.unit_value}
                                                onChange={e => handleItemChange(idx, 'unit_value', e.target.value)}
                                                placeholder="0,00"
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>FORNECEDOR</label>
                                        <select
                                            value={item.supplier_id}
                                            onChange={e => handleItemChange(idx, 'supplier_id', e.target.value)}
                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', padding: '12px', outline: 'none' }}
                                        >
                                            <option value="">Selecione...</option>
                                            {suppliers.map(sup => (
                                                <option key={sup.id} value={sup.id}>{sup.name}</option>
                                            ))}
                                            <option value="other">Outro / Sem Cadastro</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sheet-footer" style={{ marginTop: '24px' }}>
                            <button className="btn-ghost" onClick={() => setViewingOrder(null)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSaveReceiving} disabled={loading}>
                                <Send size={18} /> {loading ? 'Salvando...' : 'Salvar Recebimento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .worker-app {
          min-height: 100vh; background: var(--bg-dark); color: var(--text-primary);
          padding-top: 80px; padding-bottom: 40px;
        }
        .app-header {
          position: fixed; top: 0; left: 0; right: 0; height: 72px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; z-index: 100; border-bottom: 1px solid var(--border);
        }
        .back-btn { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: var(--text-primary); font-weight: 600; cursor: pointer;}
        .worker-meta { display: flex; align-items: center; gap: 12px; }
        .app-logo { background: var(--primary); padding: 6px; border-radius: 8px; }

        .app-content { max-width: 600px; margin: 0 auto; padding: 0 24px; }
        .action-hub { margin-bottom: 48px; }
        .welcome-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .welcome-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }
        
        .section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .title-with-icon { display: flex; align-items: center; gap: 10px; }
        .title-with-icon h2 { font-size: 18px; font-weight: 700; color: var(--text-secondary); }
        .count-badge { background: var(--bg-card); color: var(--text-muted); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid var(--border); }

        .order-list { display: flex; flex-direction: column; gap: 16px; }
        .order-card-compact { padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px; }
        .order-main { display: flex; justify-content: space-between; align-items: center; }
        .order-info { display: flex; flex-direction: column; gap: 4px; }
        .order-id { font-family: monospace; font-size: 13px; color: var(--primary); }
        .item-count { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 13px; }
        
        .status-icon-box { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .status-icon-box.approved { color: var(--status-approved); background: rgba(52, 199, 89, 0.05); }

        .order-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); margin-top: 4px; padding-top: 12px;}
        .order-date { font-size: 12px; color: var(--text-muted); }

        /* Mobile Sheet Styling */
        .modal-overlay-mobile { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; }
        .mobile-sheet { width: 100%; border-radius: 32px 32px 0 0; padding: 32px; padding-top: 12px; max-height: 90vh; overflow-y: hidden; display: flex; flex-direction: column;}
        .sheet-handle { width: 40px; height: 4px; background: var(--border); border-radius: 2px; margin: 0 auto 24px; flex-shrink: 0;}
        .sheet-header { margin-bottom: 24px; flex-shrink: 0;}
        .sheet-header h2 { font-size: 22px; font-weight: 800; }
        .sheet-header p { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

        .sheet-footer { display: flex; gap: 16px; flex-shrink: 0;}
        .sheet-footer .btn-ghost { flex: 1; }
        .sheet-footer .btn-primary { flex: 2; }
      `}</style>
        </div>
    );
};

export default WorkerReceiving;
