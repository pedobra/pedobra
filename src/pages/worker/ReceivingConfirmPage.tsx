import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    Send,
    Archive,
    Search,
    Package
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { maskCurrency, parseCurrencyToNumber } from '../../lib/masks';

const ReceivingConfirmPage = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [showMaterialResults, setShowMaterialResults] = useState(false);
    const [activeSupplierSearchIdx, setActiveSupplierSearchIdx] = useState<number | null>(null);
    const [supplierSearchTerms, setSupplierSearchTerms] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [editingItems, setEditingItems] = useState<any[]>([]);
    const [allowCustom, setAllowCustom] = useState(false);

    useEffect(() => {
        if (id) {
            fetchOrder();
            fetchSuppliers();
            fetchMaterials();
            fetchSettings();
        }
    }, [id]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('allow_custom_materials_global').maybeSingle();
        if (data) setAllowCustom(data.allow_custom_materials_global);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

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

    const handleAddExtraMaterial = (mat: any) => {
        const newItem = {
            material_id: mat.id || '',
            name: mat.name,
            quantity: 1, // Default to 1, user can change
            unit: mat.unit || 'un',
            received_quantity: '',
            unit_value: 'R$ 0,00',
            supplier_id: ''
        };
        setEditingItems([...editingItems, newItem]);
        setMaterialSearchTerm('');
        setShowMaterialResults(false);
    };

    const handleSupplierSelect = (idx: number, sup: any) => {
        handleItemChange(idx, 'supplier_id', sup?.id || 'other');
        setSupplierSearchTerms({ ...supplierSearchTerms, [idx]: sup?.name || 'Outro / Avulso' });
        setActiveSupplierSearchIdx(null);
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
                    {editingItems.map((item: any, idx: number) => {
                        const supplierTerm = supplierSearchTerms[idx] || suppliers.find(s => s.id === item.supplier_id)?.name || '';
                        const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes((supplierSearchTerms[idx] || '').toLowerCase()));

                        return (
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

                                <div className="input-field-mobile full" style={{ position: 'relative' }}>
                                    <label>Fornecedor</label>
                                    <div className="smart-search-input-wrapper">
                                        {!supplierSearchTerms[idx] && !item.supplier_id && <Search size={18} className="search-icon-inside" />}
                                        <input 
                                            type="text" 
                                            className="worker-input-smart small" 
                                            placeholder="Buscar fornecedor..." 
                                            value={supplierSearchTerms[idx] !== undefined ? supplierSearchTerms[idx] : supplierTerm}
                                            onFocus={() => setActiveSupplierSearchIdx(idx)}
                                            onChange={e => {
                                                setSupplierSearchTerms({ ...supplierSearchTerms, [idx]: e.target.value });
                                                setActiveSupplierSearchIdx(idx);
                                            }}
                                        />
                                        {activeSupplierSearchIdx === idx && (
                                            <div className="smart-results-list glass">
                                                {filteredSuppliers.map(sup => (
                                                    <div key={sup.id} className="result-item" onClick={() => handleSupplierSelect(idx, sup)}>
                                                        <span>{sup.name}</span>
                                                    </div>
                                                ))}
                                                <div className="result-item custom" onClick={() => handleSupplierSelect(idx, { id: 'other', name: 'Outro / Avulso' })}>
                                                    <span>Outro / Avulso</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Adicionar Material Extra */}
                    <div className="add-extra-material-box">
                        <h3 className="section-label">Adicionar Extra (Não Consta no Pedido)</h3>
                        <div className="smart-search-input-wrapper">
                            {!materialSearchTerm && <Search size={18} className="search-icon-inside" />}
                            <input 
                                type="text" 
                                className="worker-input-smart" 
                                placeholder="Buscar material no catálogo..." 
                                value={materialSearchTerm}
                                onFocus={() => setShowMaterialResults(true)}
                                onChange={e => {
                                    setMaterialSearchTerm(e.target.value);
                                    setShowMaterialResults(true);
                                }}
                            />
                            {showMaterialResults && (materialSearchTerm.length > 0 || materials.length > 0) && (
                                <div className="smart-results-list glass">
                                    {materials.filter(m => m.name.toLowerCase().includes(materialSearchTerm.toLowerCase())).map(m => (
                                        <div key={m.id} className="result-item" onClick={() => handleAddExtraMaterial(m)}>
                                            <Package size={14} />
                                            <span>{m.name}</span>
                                        </div>
                                    ))}
                                    {allowCustom && materialSearchTerm.length > 0 && (
                                        <div className="result-item custom" onClick={() => handleAddExtraMaterial({ name: materialSearchTerm, unit: 'un' })}>
                                            <span>Adicionar "{materialSearchTerm}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <div className="page-actions-footer">
                <button className="btn-primary-mobile" onClick={handleSaveReceiving} disabled={loading}>
                    <Send size={18} /> {loading ? 'Salvando...' : 'CONFIRMAR RECEBIMENTO'}
                </button>
            </div>

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 260px; }
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
                
                .page-actions-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 24px 20px; background: var(--bg-dark); border-top: 1px solid var(--border); z-index: 100; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); }
                .btn-primary-mobile { width: 100%; max-width: 560px; margin: 0 auto; height: 56px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }

                /* Smart Search Styles */
                .smart-search-input-wrapper { position: relative; }
                .search-icon-inside { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
                .worker-input-smart { width: 100%; height: 56px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; padding: 0 16px 0 56px; color: var(--text-primary); font-size: 16px; outline: none; transition: 0.2s; }
                .worker-input-smart:focus { border-color: var(--primary); }
                .worker-input-smart.small { height: 48px; font-size: 14px; border-radius: 12px; padding-left: 56px; }
                
                .smart-results-list { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
                .result-item { padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid var(--border); transition: 0.2s; }
                .result-item:last-child { border-bottom: none; }
                .result-item:active { background: var(--primary); color: var(--bg-dark); }
                .result-item span { font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .result-item.custom { color: var(--primary); }

                .add-extra-material-box { margin-top: 24px; padding: 20px; background: var(--bg-dark); border: 1px dashed var(--border); border-radius: 20px; }
                .section-label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: block; }
                
                .loading-spinner-box { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: 700; }
            `}</style>
        </div>
    );
};

export default ReceivingConfirmPage;
