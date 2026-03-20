import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Trash2,
    Search,
    ChevronLeft,
    Send,
    Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StandardCard from '../../components/ui/StandardCard';

const NewOrderPage = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState<any[]>([]);
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
            fetchMaterials();
            fetchSettings();
        }
    }, [profile]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('allow_custom_materials_global').maybeSingle();
        if (data) setAllowCustom(data.allow_custom_materials_global);
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
            alert('Pedido enviado com sucesso!');
            navigate('/dashboard');
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
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    <ChevronLeft size={20} />
                    <span>Voltar</span>
                </button>
                <div className="worker-meta">
                    <div className="app-logo"><Plus size={18} color="var(--bg-dark)" /></div>
                    <strong>Novo Pedido</strong>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub">
                    <h1 className="welcome-title">Solicitar Materiais</h1>
                    <p className="welcome-desc">Adicione os itens necessários para a obra.</p>
                </div>

                <StandardCard title="Catálogo e Itens" subtitle="Selecione os materiais desejados.">
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

                        <div className="input-field-mobile" style={{ marginBottom: '16px' }}>
                            <label className="section-label">Material do Catálogo</label>
                            <select 
                                className="worker-select"
                                value={currentItem.material_id}
                                onChange={e => {
                                    const m = materials.find(mat => mat.id === e.target.value);
                                    if (m) {
                                        setCurrentItem({ ...currentItem, material_id: m.id, name: m.name, unit: m.unit });
                                        setIsCustom(false);
                                    } else if (e.target.value === 'custom') {
                                        setIsCustom(true);
                                        setCurrentItem({ ...currentItem, material_id: '', name: '' });
                                    } else {
                                        setCurrentItem({ ...currentItem, material_id: '', name: '' });
                                        setIsCustom(false);
                                    }
                                }}
                            >
                                <option value="">Selecione um material...</option>
                                {filteredMaterials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                                {allowCustom && <option value="custom">+ Outro item (não listado)</option>}
                            </select>
                        </div>

                        {isCustom && (
                            <input 
                                type="text" 
                                className="worker-input" 
                                style={{ marginBottom: '12px' }}
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
                            <button className="btn-add-item" onClick={handleAddItem}>Adicionar à Lista</button>
                        </div>
                    </div>

                    <div className="added-items-list-page">
                        <h3 className="section-label">Itens na Lista ({items.length})</h3>
                        {items.length === 0 ? (
                            <div className="empty-items">Nenhum item adicionado</div>
                        ) : (
                            items.map((it, idx) => (
                                <div key={idx} className="added-item-row">
                                    <div className="item-main">
                                        <Package size={14} />
                                        <span>{it.quantity}{it.unit} • {it.name}</span>
                                    </div>
                                    <button className="delete-btn-mini" onClick={() => handleRemoveItem(idx)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="obs-section">
                        <label className="section-label">Observações</label>
                        <textarea 
                            className="worker-textarea" 
                            placeholder="Alguma instrução adicional?"
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                        />
                    </div>
                </StandardCard>

                <div className="page-actions-footer">
                    <button className="btn-primary-mobile" onClick={handleSubmitOrder} disabled={loading || items.length === 0}>
                        <Send size={18} /> {loading ? 'Enviando...' : 'FINALIZAR PEDIDO'}
                    </button>
                </div>
            </main>

            <style>{`
                .worker-app { min-height: 100vh; background: var(--bg-dark); padding: 88px 16px 160px; }
                .app-header { position: fixed; top: 0; left: 0; right: 0; height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid var(--border); }
                .back-btn { background: transparent; border: none; color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
                .worker-meta { display: flex; align-items: center; gap: 10px; font-size: 14px; }
                .app-logo { background: var(--primary); padding: 5px; border-radius: 6px; }
                
                .app-content { max-width: 600px; margin: 0 auto; }
                .welcome-title { font-size: 24px; font-weight: 850; margin-bottom: 4px; }
                .welcome-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 32px; }
                
                .item-selector-box { background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); margin-bottom: 24px; }
                .search-bar-mini { display: flex; align-items: center; gap: 8px; background: var(--bg-input); padding: 0 12px; height: 44px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; }
                .search-bar-mini input { background: transparent; border: none; color: var(--text-primary); width: 100%; outline: none; font-size: 14px; }
                
                .materials-grid-mini { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
                .mat-chip { padding: 8px 14px; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border); font-size: 12px; font-weight: 700; color: var(--text-secondary); transition: 0.2s; }
                .mat-chip.active { background: var(--primary); color: var(--bg-dark); border-color: var(--primary); }
                .mat-chip.outline { border-style: dashed; }
                
                .qty-row { display: flex; gap: 10px; }
                .worker-input, .worker-select { background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; height: 48px; padding: 0 16px; color: var(--text-primary); outline: none; font-size: 14px; width: 100%; transition: 0.2s; }
                .worker-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 18px; }
                .worker-input:focus, .worker-select:focus { border-color: var(--primary); }
                .worker-input.qty { width: 90px; text-align: center; }
                .btn-add-item { flex: 1; background: var(--text-primary); color: var(--bg-dark); border: none; border-radius: 12px; font-weight: 800; font-size: 14px; }
                
                .added-items-list-page { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
                .section-label { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; display: block; }
                
                .added-item-row { height: 44px; background: rgba(59, 130, 246, 0.05); border: 1px solid var(--border); padding: 0 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .item-main { display: flex; align-items: center; gap: 8px; }
                .empty-items { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 12px; font-size: 13px; font-weight: 600; }
                .delete-btn-mini { color: var(--status-denied); background: transparent; border: none; padding: 8px; }
                
                .obs-section { margin-top: 32px; padding-bottom: 24px; }
                .worker-textarea { width: 100%; min-height: 100px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; padding: 16px; color: var(--text-primary); outline: none; font-size: 14px; resize: none; }
                
                .page-actions-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: var(--bg-dark); border-top: 1px solid var(--border); z-index: 100; }
                .btn-primary-mobile { width: 100%; max-width: 560px; margin: 0 auto; height: 56px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 8px 24px rgba(39, 201, 140, 0.3); }
                .btn-primary-mobile:disabled { opacity: 0.5; box-shadow: none; }
            `}</style>
        </div>
    );
};

export default NewOrderPage;
