import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Save, ArrowLeft, Box, Tags } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';

const MaterialFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: ''
    });

    useEffect(() => {
        if (id) fetchMaterial();
    }, [id]);

    const fetchMaterial = async () => {
        const { data } = await supabase.from('materials').select('*').eq('id', id).single();
        if (data) {
            setFormData({
                name: data.name,
                category: data.category,
                unit: data.unit
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = id
            ? await supabase.from('materials').update(formData).eq('id', id)
            : await supabase.from('materials').insert(formData);

        if (error) alert(error.message);
        else navigate('/admin/materials');
        setLoading(false);
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
                                <select 
                                    value={formData.category} 
                                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                                    style={{ paddingLeft: '48px' }}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Estrutural">Estrutural</option>
                                    <option value="Elétrica">Elétrica</option>
                                    <option value="Hidráulica">Hidráulica</option>
                                    <option value="Acabamento">Acabamento</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-field">
                            <label>Unidade de Medida</label>
                            <select 
                                value={formData.unit} 
                                onChange={e => setFormData({ ...formData, unit: e.target.value })} 
                                required
                            >
                                <option value="">Selecione...</option>
                                <option value="un">un (Unidade)</option>
                                <option value="kg">kg (Quilograma)</option>
                                <option value="t">t (Tonelada)</option>
                                <option value="m">m (Metro Linear)</option>
                                <option value="m²">m² (Metro Quadrado)</option>
                                <option value="m³">m³ (Metro Cúbico)</option>
                                <option value="L">L (Litro)</option>
                                <option value="cx">cx (Caixa)</option>
                                <option value="saco">saco (Saco)</option>
                                <option value="rolo">rolo (Rolo)</option>
                            </select>
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
                .form-actions-sticky { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); }
                .btn-save { background: var(--primary); color: var(--bg-card); height: 44px; padding: 0 28px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
            `}</style>
        </div>
    );
};

export default MaterialFormPage;
