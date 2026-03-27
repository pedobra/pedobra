import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useSubscription } from '../../../hooks/useSubscription';
import { Save, ArrowLeft, Box, Tags } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';

const MaterialFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { maxMaterials } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: ''
    });

    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [existingUnits, setExistingUnits] = useState<string[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [isCustomUnit, setIsCustomUnit] = useState(false);

    const defaultCategories = ['Estrutural', 'Elétrica', 'Hidráulica', 'Acabamento', 'Ferramentas', 'Outros'];
    const defaultUnits = ['un', 'kg', 't', 'm', 'm²', 'm³', 'L', 'cx', 'saco', 'rolo'];

    useEffect(() => {
        if (id) fetchMaterial();
        fetchSuggestions();
    }, [id]);

    const fetchSuggestions = async () => {
        const { data } = await supabase.from('materials').select('category, unit');
        if (data) {
            const cats = Array.from(new Set(data.map(m => m.category).filter(Boolean)));
            const units = Array.from(new Set(data.map(m => m.unit).filter(Boolean)));
            
            // Merge with defaults and unique
            setExistingCategories(Array.from(new Set([...defaultCategories, ...cats as string[]])));
            setExistingUnits(Array.from(new Set([...defaultUnits, ...units as string[]])));
        } else {
            setExistingCategories(defaultCategories);
            setExistingUnits(defaultUnits);
        }
    };

    const fetchMaterial = async () => {
        const { data } = await supabase.from('materials').select('*').eq('id', id).single();
        if (data) {
            setFormData({
                name: data.name,
                category: data.category || '',
                unit: data.unit || ''
            });

            // If the category or unit is not in the default list, we show it correctly
            // (The fetchSuggestions will handle the list, but we don't need to force custom mode unless the user wants to change it to something else)
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!id && maxMaterials) {
                const { count } = await supabase.from('materials').select('*', { count: 'exact', head: true });
                if (count !== null && count >= maxMaterials) {
                    alert(`Limite Atingido: Seu plano permite apenas ${maxMaterials} materiais cadastrados.`);
                    setLoading(false);
                    return;
                }
            }

            const { error } = id
                ? await supabase.from('materials').update(formData).eq('id', id)
                : await supabase.from('materials').insert(formData);

            if (error) throw error;
            navigate('/admin');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="catalog-form-view">
            <div className="form-header">
                <button className="btn-back" onClick={() => navigate('/admin/materials')}>
                    <ArrowLeft size={18} /> Voltar para o catálogo
                </button>
                <div className="header-titles">
                    <h1 className="page-title">{id ? 'Editar Insumo' : 'Novo Material'}</h1>
                    <p className="page-subtitle">Defina as propriedades técnicas do material para pedidos.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <StandardCard title="Detalhes do Material" subtitle="Categorização e unidade de medida controlada.">
                    <div className="form-grid">
                        <div className="input-field full-width">
                            <label>Nome do Insumo</label>
                            <div className="input-wrapper">
                                <Box size={18} className="input-icon" />
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    placeholder="Ex: Cimento Portland CPII" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-field">
                            <label>Categoria</label>
                            <div className="input-wrapper">
                                <Tags size={18} className="input-icon" />
                                {!isCustomCategory ? (
                                    <select 
                                        value={formData.category} 
                                        onChange={e => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setIsCustomCategory(true);
                                                setFormData({ ...formData, category: '' });
                                            } else {
                                                setFormData({ ...formData, category: e.target.value });
                                            }
                                        }} 
                                        style={{ paddingLeft: '48px' }}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {existingCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ ADICIONAR NOVA...</option>
                                    </select>
                                ) : (
                                    <div className="custom-input-group">
                                        <input 
                                            type="text" 
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Digite a nova categoria..."
                                            autoFocus
                                            required
                                        />
                                        <button type="button" className="btn-cancel-custom" onClick={() => setIsCustomCategory(false)}>
                                            <ArrowLeft size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="input-field">
                            <label>Unidade de Medida</label>
                            <div className="input-wrapper">
                                {!isCustomUnit ? (
                                    <select 
                                        value={formData.unit} 
                                        onChange={e => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setIsCustomUnit(true);
                                                setFormData({ ...formData, unit: '' });
                                            } else {
                                                setFormData({ ...formData, unit: e.target.value });
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {existingUnits.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                        <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ ADICIONAR NOVA...</option>
                                    </select>
                                ) : (
                                    <div className="custom-input-group">
                                        <input 
                                            type="text" 
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            placeholder="Digite a unidade (ex: lt, pç...)"
                                            autoFocus
                                            required
                                        />
                                        <button type="button" className="btn-cancel-custom" onClick={() => setIsCustomUnit(false)}>
                                            <ArrowLeft size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </StandardCard>

                <div className="form-actions-sticky">
                    <button type="button" className="btn-ghost" onClick={() => navigate('/admin/materials')}>Descartar</button>
                    <button type="submit" className="btn-save" disabled={loading}>
                        <Save size={18} /> {loading ? 'Sincronizando...' : 'Confirmar Registro'}
                    </button>
                </div>
            </form>

            <style>{`
                .catalog-form-view { max-width: 800px; margin: 0 auto; }
                .form-header { margin-bottom: 40px; display: flex; flex-direction: column; gap: 24px; }
                .btn-back { background: transparent; border: none; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .full-width { grid-column: span 2; }
                .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                .input-wrapper { position: relative; display: flex; align-items: center; }
                .input-icon { position: absolute; left: 16px; color: var(--text-muted); }
                .input-field input, .input-field select { width: 100%; height: 44px; padding: 0 16px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; outline: none; }
                .input-wrapper input { padding-left: 48px !important; }
                .custom-input-group { display: flex; width: 100%; gap: 8px; align-items: center; }
                .btn-cancel-custom { background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-muted); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
                .btn-cancel-custom:hover { color: var(--text-primary); border-color: var(--text-muted); }
                .form-actions-sticky { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); }
                .btn-save { background: var(--primary); color: var(--bg-card); height: 44px; padding: 0 28px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
            `}</style>
        </div>
    );
};

export default MaterialFormPage;
