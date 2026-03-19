import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, MapPin, Globe, Save, CheckCircle2, Star, FileText, Package } from 'lucide-react';
import StandardCard from '../../components/ui/StandardCard';

const AdminSettings = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [settings, setSettings] = useState({
        company_name: '',
        cnpj: '',
        address_cep: '',
        address_street: '',
        address_number: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        logo_url: '',
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

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({ ...settings, logo_url: reader.result as string });
            };
            reader.readAsDataURL(file);
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
                    <StandardCard title="Identidade Visual" subtitle="Faça upload do logotipo da empresa.">
                        <div className="logo-upload-container">
                            <div className="logo-preview">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} alt="Logo da Empresa" />
                                ) : (
                                    <div className="logo-placeholder">Sem Logo</div>
                                )}
                            </div>
                            <label className="btn-secondary w-full" style={{ textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                                Selecionar Nova Imagem
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                            </label>
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
                
                .logo-upload-container { display: flex; flex-direction: column; gap: 16px; padding: 16px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; align-items: center; }
                .logo-preview { width: 100%; height: 160px; border-radius: 12px; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px dashed var(--border-bright); }
                .logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .logo-placeholder { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
                
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
