import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Plus, ClipboardList, Trash2, Send, Building2, Package } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';
import { sanitizeInput } from '../../../lib/security';

const OrderFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [sites, setSites] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [items, setItems] = useState<any[]>([]);
    
    // Builder State
    const [isCustom, setIsCustom] = useState(false);
    const [currentItem, setCurrentItem] = useState({ material_id: '', quantity: 1, customName: '' });

    useEffect(() => {
        fetchInitialData();
        if (id) fetchOrder();
    }, [id]);

    const fetchInitialData = async () => {
        const [{ data: sitesData }, { data: materialsData }] = await Promise.all([
            supabase.from('sites').select('*').order('name'),
            supabase.from('materials').select('*').order('name')
        ]);
        if (sitesData) setSites(sitesData);
        if (materialsData) setMaterials(materialsData);
    };

    const fetchOrder = async () => {
        const { data } = await supabase.from('orders').select('*').eq('id', id).single();
        if (data) {
            setSelectedSite(data.site_id);
            setItems(data.items || []);
        }
    };

    const addItem = () => {
        if (isCustom) {
            const safeName = sanitizeInput(currentItem.customName);
            if (!safeName) return alert('Descreva o material de forma válida (XSS detectado e bloqueado).');
            setItems([...items, { material_id: 'custom', quantity: currentItem.quantity, name: `(NOVO) ${safeName}`, unit: 'un' }]);
        } else {
            if (!currentItem.material_id) return alert('Selecione um material.');
            const mat = materials.find(m => m.id === currentItem.material_id);
            if (!mat) return;
            const existing = items.find(i => i.material_id === currentItem.material_id);
            if (existing) {
                setItems(items.map(i => i.material_id === currentItem.material_id ? { ...i, quantity: i.quantity + currentItem.quantity } : i));
            } else {
                setItems([...items, { ...currentItem, name: mat.name, unit: mat.unit }]);
            }
        }
        setCurrentItem({ material_id: '', quantity: 1, customName: '' });
        setIsCustom(false);
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        if (!selectedSite || items.length === 0) return alert('Preencha a obra e adicione itens.');
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            site_id: selectedSite,
            items: items,
            user_id: user?.id,
            status: id ? undefined : 'new'
        };

        const { error } = id 
            ? await supabase.from('orders').update({ site_id: selectedSite, items }).eq('id', id)
            : await supabase.from('orders').insert(payload);

        if (error) alert(error.message);
        else navigate('/admin/orders');
        setLoading(false);
    };

    return (
        <div className="order-form-page">
            <header className="view-header">
                <button onClick={() => navigate('/admin/orders')} className="btn-back">
                    <ArrowLeft size={18} /> Voltar
                </button>
                <div className="header-info">
                    <h1 className="page-title">{id ? 'Editar Pedido' : 'Novo Pedido de Insumos'}</h1>
                    <p className="page-subtitle">Configure o destino e os itens necessários para a obra.</p>
                </div>
            </header>

            <div className="form-grid">
                <div className="main-column">
                    <StandardCard title="Itens do Pedido" subtitle="Adicione materiais e quantidades.">
                        <div className="item-builder">
                            <div className="builder-header">
                                <label>{isCustom ? 'Descrição do Material' : 'Selecionar do Catálogo'}</label>
                                <button className="btn-toggle" onClick={() => setIsCustom(!isCustom)}>
                                    {isCustom ? 'Voltar para Catálogo' : 'Insumo não listado?'}
                                </button>
                            </div>
                            
                            <div className="builder-inputs">
                                {isCustom ? (
                                    <input type="text" className="form-input flex-1" placeholder="Ex: Areia lavada fina..." value={currentItem.customName} onChange={e => setCurrentItem({...currentItem, customName: e.target.value})} />
                                ) : (
                                    <select className="form-select flex-1" value={currentItem.material_id} onChange={e => setCurrentItem({...currentItem, material_id: e.target.value})}>
                                        <option value="">Buscar material...</option>
                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                )}
                                <input type="number" className="form-input qty" placeholder="Qtd" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})} />
                                <button className="btn-add" onClick={addItem}><Plus size={20} /></button>
                            </div>
                        </div>

                        <div className="items-list">
                            {items.length === 0 ? (
                                <div className="empty-state">
                                    <ClipboardList size={32} />
                                    <p>Nenhum item adicionado ainda.</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={idx} className="order-item-row">
                                        <div className="item-info">
                                            <Package size={16} />
                                            <strong>{item.name}</strong>
                                        </div>
                                        <div className="item-meta">
                                            <span className="qty-tag">{item.quantity} {item.unit || 'un'}</span>
                                            <button className="btn-remove" onClick={() => removeItem(idx)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </StandardCard>
                </div>

                <div className="side-column">
                    <StandardCard title="Configurações" subtitle="Destino e finalização.">
                        <div className="form-group">
                            <label><Building2 size={14} /> Obra Destino</label>
                            <select className="form-select" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                                <option value="">Selecione a obra...</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="form-summary">
                            <div className="summary-row">
                                <span>Total de Itens:</span>
                                <strong>{items.length}</strong>
                            </div>
                        </div>

                        <button className="btn-primary w-full mt-6" onClick={handleSubmit} disabled={loading || items.length === 0 || !selectedSite}>
                            <Send size={18} /> {loading ? 'Enviando...' : (id ? 'Salvar Alterações' : 'Enviar Pedido')}
                        </button>
                    </StandardCard>
                </div>
            </div>

            <style>{`
                .order-form-page { display: flex; flex-direction: column; gap: 32px; max-width: 1100px; margin: 0 auto; }
                .view-header { display: flex; align-items: center; gap: 24px; }
                .btn-back { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); height: 44px; padding: 0 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; }
                .btn-back:hover { color: var(--text-primary); border-color: var(--text-muted); }
                
                .form-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
                .item-builder { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 24px; }
                .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .builder-header label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
                .btn-toggle { background: transparent; border: none; color: var(--primary); font-size: 12px; cursor: pointer; font-weight: 600; }
                
                .builder-inputs { display: flex; gap: 12px; }
                .form-input, .form-select { background: var(--bg-input); border: 1px solid var(--border); color: var(--text-primary); height: 44px; padding: 0 16px; border-radius: 8px; outline: none; }
                .flex-1 { flex: 1; }
                .qty { width: 90px; text-align: center; }
                .btn-add { background: var(--primary); color: var(--bg-dark); border: none; padding: 0 16px; height: 44px; border-radius: 8px; cursor: pointer; }
                
                .items-list { display: flex; flex-direction: column; gap: 12px; }
                .empty-state { padding: 48px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; background: rgba(0,0,0,0.1); border-radius: 16px; border: 1px dashed var(--border); }
                
                .order-item-row { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; }
                .item-info { display: flex; align-items: center; gap: 12px; color: var(--text-primary); }
                .item-meta { display: flex; align-items: center; gap: 16px; }
                .qty-tag { background: var(--primary-glow); color: var(--primary); padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; font-family: var(--font-main); }
                .btn-remove { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
                .btn-remove:hover { color: var(--status-denied); }
                
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
                .form-summary { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
                .summary-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-secondary); }
                .w-full { width: 100%; }
                .mt-6 { margin-top: 24px; }

                @media (max-width: 900px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .side-column { order: -1; }
                }
            `}</style>
        </div>
    );
};

export default OrderFormPage;
