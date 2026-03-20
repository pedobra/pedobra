import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    Send,
    Archive
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { maskCurrency, parseCurrencyToNumber } from '../../lib/masks';

const ReceivingConfirmPage = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingItems, setEditingItems] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            fetchOrder();
            fetchSuppliers();
        }
    }, [id]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, sites(name)')
                .eq('id', id)
                .single();
            if (error) throw error;
            setOrder(data);
            setEditingItems((data.items || []).map((item: any) => ({
                ...item,
                received_quantity: item.received_quantity || '',
                unit_value: maskCurrency(item.unit_value || 0),
                supplier_id: item.supplier_id || ''
            })));
        } catch (err: any) {
            console.error(err.message);
        }
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
        return `${dd}${mm}-${seq}`;
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...editingItems];
        const finalValue = field === 'unit_value' ? maskCurrency(value) : value;
        newItems[index] = { ...newItems[index], [field]: finalValue };
        setEditingItems(newItems);
    };

    const handleSaveReceiving = async () => {
        setLoading(true);
        try {
            const finalEditingItems = editingItems.map(i => ({
                ...i, 
                received_quantity: parseFloat(i.received_quantity) || 0,
                unit_value: parseCurrencyToNumber(i.unit_value) || 0
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
                .eq('id', order.id);

            if (updateError) throw updateError;

            if (isPartial) {
                const missingItems = finalEditingItems
                    .filter(i => i.received_quantity < i.quantity)
                    .map(i => ({
                        material_id: i.material_id,
                        name: `[COMPLEMENTO REF ${getOrderRef(order)}] ${i.name}`,
                        quantity: i.quantity - i.received_quantity,
                        unit: i.unit
                    }));

                if (missingItems.length > 0) {
                    await supabase.from('orders').insert({
                        site_id: order.site_id,
                        user_id: order.user_id,
                        items: missingItems,
                        status: 'new'
                    });
                }
            }

            alert('Recebimento registrado com sucesso!');
            navigate('/dashboard/receipts');
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!order) return <div className="loading-spinner-box">Carregando dados...</div>;

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <button className="back-btn" onClick={() => navigate('/dashboard/receipts')}>
                    <ChevronLeft size={20} />
                    <span>Voltar</span>
                </button>
                <div className="worker-meta">
                    <div className="app-logo"><Archive size={18} color="var(--bg-dark)" /></div>
                    <strong>Confirmar Carga</strong>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub">
                    <h1 className="welcome-title">Baixa de Materiais</h1>
                    <p className="welcome-desc">REF: {getOrderRef(order)} • {order.sites?.name}</p>
                </div>

                <div className="receiving-items-list-page">
                    {editingItems.map((item: any, idx: number) => (
                        <div key={idx} className="receiving-item-card-page">
                            <div className="item-title-row-page">
                                <strong>{item.name}</strong>
                                <span className="req-qty-pill">SOL: {item.quantity} {item.unit}</span>
                            </div>
                            
                            <div className="receiving-inputs-grid">
                                <div className="input-field-mobile">
                                    <label>Qtd Recebida</label>
                                    <input 
                                        type="number" 
                                        value={item.received_quantity} 
                                        onChange={e => handleItemChange(idx, 'received_quantity', e.target.value)} 
                                        placeholder="Quanto chegou?" 
                                    />
                                </div>
                                <div className="input-field-mobile">
                                    <label>Valor Unit. (R$)</label>
                                    <input 
                                        type="text" 
                                        value={item.unit_value} 
                                        onChange={e => handleItemChange(idx, 'unit_value', e.target.value)} 
                                        placeholder="R$ 0,00" 
                                    />
                                </div>
                            </div>

                            <div className="input-field-mobile full">
                                <label>Fornecedor</label>
                                <select value={item.supplier_id} onChange={e => handleItemChange(idx, 'supplier_id', e.target.value)}>
                                    <option value="">Selecione o fornecedor...</option>
                                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                    <option value="other">Outro / Avulso</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="page-actions-footer">
                    <button className="btn-primary-mobile" onClick={handleSaveReceiving} disabled={loading}>
                        <Send size={18} /> {loading ? 'Salvando...' : 'CONFIRMAR RECEBIMENTO'}
                    </button>
                </div>
            </main>

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 120px; }
                .app-header { position: fixed; top: 0; left: 0; right: 0; height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid var(--border); }
                .back-btn { background: transparent; border: none; color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
                .worker-meta { display: flex; align-items: center; gap: 10px; font-size: 14px; }
                .app-logo { background: var(--primary); padding: 5px; border-radius: 6px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .welcome-title { font-size: 24px; font-weight: 850; margin-bottom: 4px; }
                .welcome-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }
                
                .receiving-items-list-page { display: flex; flex-direction: column; gap: 16px; }
                .receiving-item-card-page { background: var(--bg-card); padding: 20px; border-radius: 20px; border: 1px solid var(--border); }
                .item-title-row-page { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .item-title-row-page strong { font-size: 15px; color: var(--text-primary); }
                .req-qty-pill { font-size: 10px; font-weight: 800; background: rgba(39, 201, 140, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 20px; }
                
                .receiving-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
                .input-field-mobile { display: flex; flex-direction: column; gap: 6px; }
                .input-field-mobile label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
                .input-field-mobile input, .input-field-mobile select { width: 100%; height: 48px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); padding: 0 16px; outline: none; font-size: 14px; transition: 0.2s; }
                .input-field-mobile input:focus, .input-field-mobile select:focus { border-color: var(--primary); }
                .input-field-mobile.full { grid-column: span 2; }
                
                .page-actions-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: var(--bg-dark); border-top: 1px solid var(--border); z-index: 100; }
                .btn-primary-mobile { width: 100%; max-width: 560px; margin: 0 auto; height: 56px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 8px 24px rgba(39, 201, 140, 0.3); }
                
                .loading-spinner-box { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: 700; }
            `}</style>
        </div>
    );
};

export default ReceivingConfirmPage;
