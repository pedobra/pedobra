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
    const [showResults, setShowResults] = useState(false);
    const [allowCustom, setAllowCustom] = useState(false);

    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({
        material_id: '',
        name: '',
        quantity: '',
        unit: 'un',
        category: 'Outros'
    });
    const [existingCategories, setExistingCategories] = useState<string[]>(['Estrutural', 'Elétrica', 'Hidráulica', 'Acabamento', 'Outros']);
    const [existingUnits, setExistingUnits] = useState<string[]>(['un', 'kg', 't', 'm', 'm²', 'm³', 'L', 'cx', 'saco', 'rolo']);
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
        if (data) {
            setMaterials(data);
            
            // Extract distinct patterns for suggestions
            const cats = Array.from(new Set(data.map(m => m.category).filter(Boolean)));
            const units = Array.from(new Set(data.map(m => m.unit).filter(Boolean)));
            
            if (cats.length > 0) setExistingCategories(Array.from(new Set([...['Estrutural', 'Elétrica', 'Hidráulica', 'Acabamento', 'Outros'], ...cats as string[]])));
            if (units.length > 0) setExistingUnits(Array.from(new Set([...['un', 'kg', 't', 'm', 'm²', 'm³', 'L', 'cx', 'saco', 'rolo'], ...units as string[]])));
        }
    };

    const handleAddItem = () => {
        if (!currentItem.quantity || (!currentItem.material_id && !currentItem.name)) return;
        
        let finalItem = { ...currentItem };
        if (!isCustom) {
            const mat = materials.find(m => m.id === currentItem.material_id);
            finalItem.name = mat?.name;
            finalItem.unit = mat?.unit;
        }

        setItems([...items, { ...finalItem, quantity: parseFloat(currentItem.quantity), isCustom }]);
        setCurrentItem({ material_id: '', name: '', quantity: '', unit: 'un', category: 'Outros' });
        setSearchTerm('');
        setIsCustom(false);
        setShowResults(false);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleSubmitOrder = async () => {
        if (items.length === 0) return;
        setLoading(true);
        try {
            // 1. Process custom materials to add them to catalog first
            const processedItems = await Promise.all(items.map(async item => {
                if (item.isCustom) {
                    const { data, error } = await supabase.from('materials').insert({
                        name: item.name,
                        category: item.category || 'Outros',
                        unit: item.unit || 'un',
                        organization_id: profile.organization_id
                    }).select().single();
                    
                    if (error) {
                        console.error('Erro ao cadastrar material:', error);
                        // Fallback to item as is, but without material_id
                        return { name: item.name, unit: item.unit, quantity: item.quantity };
                    }
                    
                    return {
                        material_id: data.id,
                        name: data.name,
                        unit: data.unit,
                        quantity: item.quantity
                    };
                }
                return {
                    material_id: item.material_id,
                    name: item.name,
                    unit: item.unit,
                    quantity: item.quantity
                };
            }));

            // 2. Insert the actual order
            const { error } = await supabase.from('orders').insert({
                site_id: profile.site_id,
                user_id: profile.id,
                items: processedItems,
                observations,
                status: 'new'
            });

            if (error) throw error;
            alert('Pedido enviado com sucesso! Novos materiais foram adicionados ao catálogo.');
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

                <StandardCard title="Catálogo e Itens" subtitle="Busque e adicione materiais à lista.">
                    <div className="item-selector-box-modern">
                        <div className="search-group-smart">
                            <label className="section-label">Buscar Material</label>
                            <div className="smart-search-input-wrapper">
                                <Search size={18} className="search-icon-inside" />
                                <input 
                                    type="text" 
                                    className="worker-input-smart" 
                                    placeholder="Ex: Cimento, Areia, Brita..." 
                                    value={searchTerm}
                                    onFocus={() => setShowResults(true)}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        setShowResults(true);
                                        if (isCustom) setCurrentItem({ ...currentItem, name: e.target.value });
                                    }}
                                />
                                {showResults && (searchTerm.length > 0 || materials.length > 0) && (
                                    <div className="smart-results-list glass">
                                        {filteredMaterials.map(m => (
                                            <div 
                                                key={m.id} 
                                                className="result-item"
                                                onClick={() => {
                                                    setCurrentItem({ ...currentItem, material_id: m.id, name: m.name, unit: m.unit });
                                                    setSearchTerm(m.name);
                                                    setIsCustom(false);
                                                    setShowResults(false);
                                                }}
                                            >
                                                <Package size={14} />
                                                <span>{m.name}</span>
                                            </div>
                                        ))}
                                        {allowCustom && searchTerm.length > 0 && !filteredMaterials.some(m => m.name.toLowerCase() === searchTerm.toLowerCase()) && (
                                            <div 
                                                className="result-item custom"
                                                onClick={() => {
                                                    setIsCustom(true);
                                                    setCurrentItem({ ...currentItem, material_id: '', name: searchTerm });
                                                    setShowResults(false);
                                                }}
                                            >
                                                <Plus size={14} />
                                                <span>Adicionar "{searchTerm}" como novo</span>
                                            </div>
                                        )}
                                        {filteredMaterials.length === 0 && !allowCustom && (
                                            <div className="no-results-text">Nenhum material encontrado</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isCustom && (
                            <div className="custom-material-fields animate-fade-in" style={{ marginTop: '16px', border: '1.5px dashed var(--primary)', padding: '16px', borderRadius: '16px', background: 'rgba(var(--primary-rgb), 0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>Cadastrar Novo Material</span>
                                    <button onClick={() => setIsCustom(false)} style={{ background: 'transparent', border: 'none', color: 'var(--status-denied)', fontSize: '11px', fontWeight: 700 }}>CANCELAR</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="input-field-group">
                                        <label className="section-label" style={{ fontSize: '10px' }}>Categoria</label>
                                        <select 
                                            className="worker-input-smart compact" 
                                            value={currentItem.category}
                                            onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })}
                                            style={{ height: '44px', paddingLeft: '12px', fontSize: '13px' }}
                                        >
                                            {existingCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-field-group">
                                        <label className="section-label" style={{ fontSize: '10px' }}>Unidade</label>
                                        <select 
                                            className="worker-input-smart compact" 
                                            value={currentItem.unit}
                                            onChange={e => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                            style={{ height: '44px', paddingLeft: '12px', fontSize: '13px' }}
                                        >
                                            {existingUnits.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="qty-row-modern" style={{ marginTop: '16px' }}>
                            <div className="qty-input-group">
                                <label className="section-label">Qtd</label>
                                <input 
                                    type="number" 
                                    className="worker-input-smart qty" 
                                    placeholder="0" 
                                    inputMode="decimal"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                                />
                            </div>
                            <button className="btn-add-item-modern" onClick={handleAddItem}>
                                <Plus size={18} /> Adicionar à Lista
                            </button>
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
                                        {it.isCustom && <span className="custom-badge">NOVO</span>}
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

            </main>

            <div className="page-actions-footer">
                <button className="btn-primary-mobile" onClick={handleSubmitOrder} disabled={loading || items.length === 0}>
                    <Send size={18} /> {loading ? 'Enviando...' : 'FINALIZAR PEDIDO'}
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
                
                .search-group-smart { position: relative; }
                .smart-search-input-wrapper { position: relative; }
                .search-icon-inside { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
                .worker-input-smart { width: 100%; height: 56px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; padding: 0 16px 0 48px; color: var(--text-primary); font-size: 16px; outline: none; transition: 0.2s; }
                .worker-input-smart:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(39, 201, 140, 0.1); }
                
                .smart-results-list { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; max-height: 280px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
                .result-item { padding: 14px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid var(--border); transition: 0.2s; }
                .result-item:last-child { border-bottom: none; }
                .result-item:active { background: var(--primary); color: var(--bg-dark); }
                .result-item span { font-size: 14px; font-weight: 700; }
                .result-item.custom { color: var(--primary); }
                .no-results-text { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }

                .qty-row-modern { display: flex; gap: 12px; align-items: flex-end; }
                .qty-input-group { flex-shrink: 0; }
                .worker-input-smart.qty { width: 80px; text-align: center; padding: 0; }
                .btn-add-item-modern { flex: 1; height: 56px; background: var(--text-primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
                .btn-add-item-modern:active { transform: scale(0.96); }
                
                .added-items-list-page { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
                .section-label { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; display: block; }
                
                .added-item-row { height: 44px; background: rgba(59, 130, 246, 0.05); border: 1px solid var(--border); padding: 0 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .item-main { display: flex; align-items: center; gap: 8px; }
                .item-main .custom-badge { font-size: 8px; background: var(--primary); color: var(--bg-dark); padding: 2px 4px; border-radius: 4px; margin-left: 4px; font-weight: 900; vertical-align: middle; }
                .empty-items { padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 12px; font-size: 13px; font-weight: 600; }
                .delete-btn-mini { color: var(--status-denied); background: transparent; border: none; padding: 8px; }
                
                .obs-section { margin-top: 32px; padding-bottom: 24px; }
                .worker-textarea { width: 100%; min-height: 100px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; padding: 16px; color: var(--text-primary); outline: none; font-size: 14px; resize: none; }
                
                .page-actions-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 24px 20px; background: var(--bg-dark); border-top: 1px solid var(--border); z-index: 100; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); }
                .btn-primary-mobile { width: 100%; max-width: 560px; margin: 0 auto; height: 56px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 8px 24px rgba(39, 201, 140, 0.3); }
                .btn-primary-mobile:disabled { opacity: 0.5; box-shadow: none; }
            `}</style>
        </div>
    );
};

export default NewOrderPage;
