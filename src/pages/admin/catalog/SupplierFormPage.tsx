import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Save, ArrowLeft, Truck, Warehouse, MessageCircle, Phone, Loader2 } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';

const SPECIALTY_OPTIONS = [
    'Construção Civil', 'Elétrica', 'Hidráulica / Encanamento', 'Alvenaria / Estrutura',
    'Acabamento / Pintura', 'Esquadrias / Vidraçaria', 'Impermeabilização',
    'Ar Condicionado / HVAC', 'Segurança / CFTV', 'Fundação / Terraplanagem',
    'Paisagismo', 'Locação de Equipamentos', 'Distribuição de Materiais',
    'Logística / Transporte', 'Ferragens em Geral', 'Outros',
];

const SupplierFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        contact: '',
        rating: 5,
        contact_name: '',
        whatsapp: '',
        address_cep: '',
        address_street: '',
        address_number: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
    });

    const [specialtySelect, setSpecialtySelect] = useState('');
    const [specialtyCustom, setSpecialtyCustom] = useState('');
    const [delivers, setDelivers] = useState(false);

    useEffect(() => {
        if (id) fetchSupplier();
    }, [id]);

    const fetchSupplier = async () => {
        const { data } = await supabase.from('suppliers').select('*').eq('id', id).single();
        if (data) {
            setFormData({
                name: data.name || '',
                cnpj: data.cnpj || '',
                contact: data.contact || '',
                rating: data.rating || 5,
                contact_name: data.contact_name || '',
                whatsapp: data.whatsapp || '',
                address_cep: data.address_cep || '',
                address_street: data.address_street || '',
                address_number: data.address_number || '',
                address_neighborhood: data.address_neighborhood || '',
                address_city: data.address_city || '',
                address_state: data.address_state || '',
            });
            const isKnown = SPECIALTY_OPTIONS.includes(data.specialty);
            setSpecialtySelect(isKnown ? data.specialty : (data.specialty ? 'Outros' : ''));
            setSpecialtyCustom(!isKnown ? data.specialty : '');
            setDelivers(!!data.delivers);
        }
    };

    const handleCepLookup = async (cep: string) => {
        const cleaned = cep.replace(/\D/g, '');
        setFormData(p => ({ ...p, address_cep: cleaned }));
        if (cleaned.length !== 8) return;
        
        setCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
            const json = await res.json();
            if (!json.erro) {
                setFormData(prev => ({
                    ...prev,
                    address_street: json.logradouro || prev.address_street,
                    address_neighborhood: json.bairro || prev.address_neighborhood,
                    address_city: json.localidade || prev.address_city,
                    address_state: json.uf || prev.address_state,
                }));
            }
        } catch { } finally { setCepLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const resolvedSpecialty = specialtySelect === 'Outros' ? specialtyCustom : specialtySelect;
        const payload = { ...formData, specialty: resolvedSpecialty, delivers };

        const { error } = id
            ? await supabase.from('suppliers').update(payload).eq('id', id)
            : await supabase.from('suppliers').insert(payload);

        if (error) alert(error.message);
        else navigate('/admin/suppliers');
        setLoading(false);
    };

    return (
        <div className="catalog-form-view">
            <div className="form-header">
                <button className="btn-back" onClick={() => navigate('/admin/suppliers')}>
                    <ArrowLeft size={18} /> Voltar para parceiros
                </button>
                <div className="header-titles">
                    <h1 className="page-title">{id ? 'Ficha do Fornecedor' : 'Novo Parceiro Logístico'}</h1>
                    <p className="page-subtitle">Gestão de credenciamento e dados de contato do fornecedor.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <StandardCard title="Dados Corporativos" subtitle="Informações fiscais e especialidade do parceiro.">
                    <div className="form-grid">
                        <div className="input-field full-width">
                            <label>Razão Social / Nome Fantasia</label>
                            <div className="input-wrapper">
                                <Warehouse size={18} className="input-icon" />
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    placeholder="Ex: Supply Engenharia LTDA" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-field">
                            <label>CNPJ</label>
                            <input 
                                type="text" 
                                value={formData.cnpj} 
                                onChange={e => setFormData({ ...formData, cnpj: e.target.value })} 
                                placeholder="00.000.000/0001-00" 
                            />
                        </div>

                        <div className="input-field">
                            <label>Especialidade Principal</label>
                            <select 
                                value={specialtySelect} 
                                onChange={e => setSpecialtySelect(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {SPECIALTY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {specialtySelect === 'Outros' && (
                            <div className="input-field full-width">
                                <label>Descreva a Especialidade</label>
                                <input 
                                    type="text" 
                                    value={specialtyCustom} 
                                    onChange={e => setSpecialtyCustom(e.target.value)} 
                                    placeholder="Ex: Instalações Criogênicas" 
                                    required 
                                />
                            </div>
                        )}

                        <div className="input-field">
                            <label>Logística de Entrega</label>
                            <button 
                                type="button" 
                                className={`custom-toggle ${delivers ? 'active' : ''}`}
                                onClick={() => setDelivers(!delivers)}
                            >
                                <Truck size={14} />
                                {delivers ? 'Realiza Entregas' : 'Não Realiza Entregas'}
                            </button>
                        </div>
                        
                        <div className="input-field">
                            <label>Avaliação (1-5)</label>
                            <input type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} />
                        </div>
                    </div>
                </StandardCard>

                <StandardCard title="Canais de Comunicação" subtitle="Contatos diretos para pedidos e orçamentos.">
                    <div className="form-grid">
                        <div className="input-field">
                            <label>Nome do Responsável</label>
                            <div className="input-wrapper">
                                <MessageCircle size={18} className="input-icon" />
                                <input type="text" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} placeholder="Nome do representante" required />
                            </div>
                        </div>
                        <div className="input-field">
                            <label>WhatsApp Corporativo</label>
                            <div className="input-wrapper">
                                <Phone size={18} className="input-icon" />
                                <input type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="11999999999" />
                            </div>
                        </div>
                        <div className="input-field full-width">
                            <label>E-mail / Canal de Atendimento</label>
                            <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="comercial@fornecedor.com.br" />
                        </div>
                    </div>
                </StandardCard>

                <StandardCard title="Localização" subtitle="Endereço físico para logística e retiradas.">
                    <div className="form-grid">
                        <div className="input-field">
                            <label>CEP</label>
                            <div className="input-wrapper">
                                <input type="text" value={formData.address_cep} onChange={e => handleCepLookup(e.target.value)} placeholder="00000-000" maxLength={9} />
                                {cepLoading && <Loader2 size={16} className="spin-icon" />}
                            </div>
                        </div>
                        <div className="input-field">
                            <label>Rua / Logradouro</label>
                            <input type="text" value={formData.address_street} onChange={e => setFormData({...formData, address_street: e.target.value})} />
                        </div>
                        <div className="input-field">
                            <label>Número</label>
                            <input type="text" value={formData.address_number} onChange={e => setFormData({...formData, address_number: e.target.value})} />
                        </div>
                        <div className="input-field">
                            <label>Bairro</label>
                            <input type="text" value={formData.address_neighborhood} onChange={e => setFormData({...formData, address_neighborhood: e.target.value})} />
                        </div>
                        <div className="input-field">
                            <label>Cidade</label>
                            <input type="text" value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})} />
                        </div>
                        <div className="input-field">
                            <label>Estado</label>
                            <input type="text" value={formData.address_state} onChange={e => setFormData({...formData, address_state: e.target.value})} maxLength={2} />
                        </div>
                    </div>
                </StandardCard>

                <div className="form-actions-sticky">
                    <button type="button" className="btn-ghost" onClick={() => navigate('/admin/suppliers')}>Descartar</button>
                    <button type="submit" className="btn-save" disabled={loading}>
                        <Save size={18} /> {loading ? 'Sincronizando...' : 'Salvar Registro'}
                    </button>
                </div>
            </form>

            <style>{`
                .catalog-form-view { max-width: 860px; margin: 0 auto; }
                .form-header { margin-bottom: 40px; display: flex; flex-direction: column; gap: 24px; }
                .btn-back { background: transparent; border: none; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .full-width { grid-column: span 2; }
                .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                .input-wrapper { position: relative; display: flex; align-items: center; }
                .input-icon { position: absolute; left: 16px; color: var(--text-muted); }
                .input-field input, .input-field select { width: 100%; height: 44px; padding: 0 16px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; outline: none; }
                .input-wrapper input { padding-left: 48px !important; }
                
                .custom-toggle { 
                    width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; gap: 10px;
                    padding: 0 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-input);
                    color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.3s;
                }
                .custom-toggle.active { background: var(--primary-glow); border-color: var(--primary); color: var(--primary); }
                
                .spin-icon { position: absolute; right: 16px; color: var(--primary); animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .form-actions-sticky { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); }
                .btn-save { background: var(--primary); color: var(--bg-card); height: 44px; padding: 0 28px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
            `}</style>
        </div>
    );
};

export default SupplierFormPage;
