import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Save, ArrowLeft, Building2, MapPin } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';

const SiteFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        cep: '',
        address: '',
        budget: ''
    });

    useEffect(() => {
        if (id) {
            fetchSite();
        }
    }, [id]);

    const fetchSite = async () => {
        const { data, error } = await supabase.from('sites').select('*').eq('id', id).single();
        if (data) {
            setFormData({
                name: data.name,
                cep: data.address?.cep || '',
                address: data.address?.full || '',
                budget: data.settings?.budget_planned?.toString() || '0'
            });
        }
    };

    const handleCEPLookup = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, cep: cleanCEP }));

        if (cleanCEP.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
                    }));
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            name: formData.name,
            address: {
                full: formData.address,
                cep: formData.cep
            },
            settings: {
                budget_planned: parseFloat(formData.budget) || 0
            }
        };

        const { error } = id
            ? await supabase.from('sites').update(payload).eq('id', id)
            : await supabase.from('sites').insert(payload);

        if (error) {
            alert(error.message);
        } else {
            navigate('/admin/obras');
        }
        setLoading(false);
    };

    return (
        <div className="site-form-view">
            <div className="form-header">
                <button className="btn-back" onClick={() => navigate('/admin/obras')}>
                    <ArrowLeft size={18} /> Voltar para lista
                </button>
                <div className="header-titles">
                    <h1 className="page-title">{id ? 'Editar Canteiro' : 'Novo Canteiro de Obra'}</h1>
                    <p className="page-subtitle">Configure os detalhes técnicos e financeiros da unidade.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <StandardCard 
                    title="Informações do Projeto" 
                    subtitle="Identificação e orçamento planejado para a obra."
                >
                    <div className="form-grid">
                        <div className="input-field full-width">
                            <label>Nome do Canteiro</label>
                            <div className="input-wrapper">
                                <Building2 size={18} className="input-icon" />
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    placeholder="Ex: Residencial Diamond" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-field">
                            <label>Orçamento Planejado (R$)</label>
                            <input 
                                type="number" 
                                value={formData.budget} 
                                onChange={e => setFormData({ ...formData, budget: e.target.value })} 
                                placeholder="0.00" 
                                required 
                            />
                        </div>

                        <div className="input-field">
                            <label>Busca por CEP</label>
                            <input 
                                type="text" 
                                value={formData.cep} 
                                onChange={e => handleCEPLookup(e.target.value)} 
                                placeholder="00000-000" 
                                maxLength={9}
                                required 
                            />
                        </div>

                        <div className="input-field full-width">
                            <label>Endereço Completo</label>
                            <div className="input-wrapper">
                                <MapPin size={18} className="input-icon" />
                                <input 
                                    type="text" 
                                    value={formData.address} 
                                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                    placeholder="Logradouro, Número, Bairro, Cidade - UF" 
                                    required 
                                />
                            </div>
                        </div>
                    </div>
                </StandardCard>

                <div className="form-actions-sticky">
                    <button type="button" className="btn-ghost" onClick={() => navigate('/admin/obras')}>
                        Descartar
                    </button>
                    <button type="submit" className="btn-save" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>

            <style>{`
                .site-form-view { max-width: 800px; margin: 0 auto; }
                .form-header { margin-bottom: 40px; display: flex; flex-direction: column; gap: 24px; }
                .btn-back { 
                    background: transparent; border: none; color: var(--text-muted); 
                    display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
                    cursor: pointer; width: fit-content; padding: 0;
                }
                .btn-back:hover { color: var(--primary); }
                
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .full-width { grid-column: span 2; }
                
                .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                .input-wrapper { position: relative; display: flex; align-items: center; }
                .input-icon { position: absolute; left: 16px; color: var(--text-muted); }
                .input-wrapper input { padding-left: 48px !important; }
                
                .input-field input { 
                    width: 100%; padding: 14px 16px; background: var(--bg-input); 
                    border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); 
                    font-size: 14px; outline: none; transition: 0.3s;
                }
                .input-field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
                
                .form-actions-sticky {
                    display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px;
                    padding-top: 24px; border-top: 1px solid var(--border);
                }
                .btn-save {
                    background: var(--primary); color: var(--bg-card); padding: 12px 28px;
                    border-radius: 12px; font-weight: 700; border: none; cursor: pointer;
                    display: flex; align-items: center; gap: 10px; transition: 0.3s;
                }
                .btn-save:hover { transform: translateY(-2px); box-shadow: var(--shadow-premium); }
                
                @media (max-width: 768px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .full-width { grid-column: span 1; }
                }
            `}</style>
        </div>
    );
};

export default SiteFormPage;
