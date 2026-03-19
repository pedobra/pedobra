import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, MapPin, Globe, Save, CheckCircle2, Crown, CreditCard, Star, FileText, Package, Calendar } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import StandardCard from '../../components/ui/StandardCard';

const AdminSettings = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { isTrial, daysRemaining } = useSubscription();
    const [settings, setSettings] = useState({
        company_name: '',
        cnpj: '',
        address_cep: '',
        address_street: '',
        address_number: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        pdf_show_site_address: true,
        allow_custom_materials_global: false
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('*').single();
        if (data) setSettings({ ...settings, ...data });
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('company_settings').upsert({
            ...settings,
            updated_at: new Date().toISOString()
        });
        if (!error) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setLoading(false);
    };

    const handleCEPBlur = async () => {
        const cep = settings.address_cep.replace(/\D/g, '');
        if (cep.length === 8) {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json());
            if (!res.erro) {
                setSettings({ ...settings, address_street: res.logradouro, address_neighborhood: res.bairro, address_city: res.localidade, address_state: res.uf });
            }
        }
    };

    return (
        <div className="settings-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Configurações Gerais</h1>
                    <p className="page-subtitle">Personalize a identidade da sua organização e parâmetros do sistema.</p>
                </div>
                <button className="btn-primary" onClick={handleSave} disabled={loading}>
                    {success ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {loading ? 'Salvando...' : success ? 'Salvo com Sucesso' : 'Salvar Alterações'}
                </button>
            </header>

            <div className="settings-grid">
                <div className="main-column">
                    <StandardCard title="Dados da Empresa" subtitle="Estas informações aparecerão nos documentos e PDFs gerados.">
                        <div className="form-group">
                            <label><Building size={14} /> Nome da Organização / Razão Social</label>
                            <input type="text" className="form-input" value={settings.company_name} onChange={e => setSettings({...settings, company_name:e.target.value})} placeholder="Ex: Engenharia & Construções LTDA" />
                        </div>
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label><Globe size={14} /> CNPJ</label>
                                <input type="text" className="form-input" value={settings.cnpj} onChange={e => setSettings({...settings, cnpj:e.target.value})} placeholder="00.000.000/0001-00" />
                            </div>
                            <div className="form-group flex-1">
                                <label><MapPin size={14} /> CEP</label>
                                <input type="text" className="form-input" value={settings.address_cep} onChange={e => setSettings({...settings, address_cep:e.target.value})} onBlur={handleCEPBlur} placeholder="00000-000" />
                            </div>
                        </div>
                        <div className="form-row">
                             <div className="form-group flex-3">
                                <label>Logradouro</label>
                                <input type="text" className="form-input" value={settings.address_street} onChange={e => setSettings({...settings, address_street:e.target.value})} />
                            </div>
                            <div className="form-group flex-1">
                                <label>Número</label>
                                <input type="text" className="form-input" value={settings.address_number} onChange={e => setSettings({...settings, address_number:e.target.value})} />
                            </div>
                        </div>
                        <div className="form-row">
                             <div className="form-group flex-1">
                                <label>Cidade</label>
                                <input type="text" className="form-input" value={settings.address_city} readOnly />
                            </div>
                            <div className="form-group flex-1">
                                <label>Estado</label>
                                <input type="text" className="form-input" value={settings.address_state} readOnly />
                            </div>
                        </div>
                    </StandardCard>

                    <StandardCard title="Preferências de Exportação" subtitle="Controle como os arquivos PDF são gerados.">
                         <div className="toggle-item">
                            <div>
                                <strong>Exibir endereço da obra nos pedidos</strong>
                                <p>Inclui o endereço completo do canteiro no cabeçalho dos PDFs.</p>
                            </div>
                            <input type="checkbox" className="ios-toggle" checked={settings.pdf_show_site_address} onChange={e => setSettings({...settings, pdf_show_site_address: e.target.checked})} />
                        </div>
                    </StandardCard>
                </div>

                <div className="side-column">
                    <StandardCard title="Plano e Assinatura" subtitle="Status do seu licenciamento.">
                        <div className="plan-card">
                            <div className="plan-header">
                                <Crown size={24} className="plan-icon" />
                                <div>
                                    <span className="plan-name">Plano Enterprise</span>
                                    <span className={`plan-status ${isTrial ? 'trial' : 'active'}`}>
                                        {isTrial ? 'Período de Teste' : 'Assinatura Ativa'}
                                    </span>
                                </div>
                            </div>
                            <div className="plan-details">
                                <div className="detail-row">
                                    <Calendar size={14} />
                                    <span>Vencimento:</span>
                                    <strong>{isTrial ? `${daysRemaining} dias restantes` : 'Renovação Mensal'}</strong>
                                </div>
                                <div className="detail-row">
                                    <CreditCard size={14} />
                                    <span>Método:</span>
                                    <strong>Cartão de Crédito</strong>
                                </div>
                            </div>
                            <button className="btn-secondary w-full">Gerenciar Faturamento</button>
                        </div>
                    </StandardCard>

                    <StandardCard title="Suporte Integrado" subtitle="Precisa de ajuda?">
                        <ul className="support-list">
                            <li><Star size={14} color="var(--primary)" /> Central de Ajuda</li>
                            <li><FileText size={14} color="var(--primary)" /> Documentação API</li>
                            <li className="premium-link"><Package size={14} color="var(--primary)" /> Solicitar Personalização</li>
                        </ul>
                    </StandardCard>
                </div>
            </div>

            <style>{`
                .settings-view { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .settings-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }
                .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
                .form-group label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
                .form-row { display: flex; gap: 16px; margin-bottom: 20px; }
                .flex-1 { flex: 1; }
                .flex-3 { flex: 3; }
                
                .toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; }
                .toggle-item strong { display: block; font-size: 14px; color: var(--text-primary); }
                .toggle-item p { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
                
                .plan-card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
                .plan-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
                .plan-icon { color: var(--primary); filter: drop-shadow(0 0 8px var(--primary-glow)); }
                .plan-name { display: block; font-size: 16px; font-weight: 800; color: var(--text-primary); }
                .plan-status { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
                .plan-status.active { background: rgba(52,199,89,0.1); color: #34C759; }
                .plan-status.trial { background: rgba(255,149,0,0.1); color: #FF9500; }
                
                .plan-details { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
                .detail-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
                .detail-row strong { margin-left: auto; color: var(--text-primary); }
                
                .support-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; }
                .support-list li { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-secondary); cursor: pointer; transition: 0.2s; }
                .support-list li:hover { color: var(--text-primary); }
                .premium-link { font-weight: 700; color: var(--primary) !important; }
                
                .w-full { width: 100%; }

                @media (max-width: 800px) {
                    .settings-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default AdminSettings;
