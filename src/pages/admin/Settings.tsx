import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Building,
    MapPin,
    Globe,
    Upload,
    Save,
    CheckCircle2,
    Search,
    ShieldCheck,
    FileText,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

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
        pdf_show_site_address: true
    });
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('*').single();
        if (data) setSettings(data);

        // Fetch sites for permissions
        const { data: sitesData } = await supabase.from('sites').select('*').order('name');
        if (sitesData) setSites(sitesData);
    };

    const toggleSitePermission = async (siteId: string, currentSettings: any) => {
        const newSettings = {
            ...currentSettings,
            allow_custom_materials: !currentSettings?.allow_custom_materials
        };

        const { error } = await supabase
            .from('sites')
            .update({ settings: newSettings })
            .eq('id', siteId);

        if (error) alert(error.message);
        else {
            setSites(sites.map(s => s.id === siteId ? { ...s, settings: newSettings } : s));
        }
    };

    const handleCEPBlur = async () => {
        const cep = settings.address_cep.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setSettings({
                        ...settings,
                        address_street: data.logradouro,
                        address_neighborhood: data.bairro,
                        address_city: data.localidade,
                        address_state: data.uf
                    });
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            setSettings({ ...settings, logo_url: publicUrl });
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('company_settings').upsert({
            id: 1,
            company_name: settings.company_name,
            cnpj: settings.cnpj,
            address_cep: settings.address_cep,
            address_street: settings.address_street,
            address_number: settings.address_number,
            address_neighborhood: settings.address_neighborhood,
            address_city: settings.address_city,
            address_state: settings.address_state,
            logo_url: settings.logo_url,
            pdf_show_site_address: settings.pdf_show_site_address,
            updated_at: new Date()
        });

        if (error) alert(error.message);
        else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setLoading(false);
    };

    return (
        <div className="settings-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Configurações do Sistema</h1>
                    <p className="page-subtitle">Configure a identidade visual e os parâmetros corporativos da sua conta Master.</p>
                </div>
                <div className="header-actions">
                    <div className={`status-indicator ${success ? 'active' : ''}`}>
                        <CheckCircle2 size={16} />
                        <span>Atualizado com Sucesso</span>
                    </div>
                </div>
            </header>

            <div className="settings-grid">
                <main className="settings-main-form">
                    <form onSubmit={handleSubmit} className="premium-card">
                        <section className="form-section">
                            <div className="section-title-sm">
                                <Building size={16} />
                                <span>Identidade Corporativa</span>
                            </div>
                            <div className="input-field">
                                <label>Razão Social / Nome da Empresa</label>
                                <input type="text" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} placeholder="Ex: Engenharia de Elite S.A." required />
                            </div>
                            <div className="input-field">
                                <label>CNPJ</label>
                                <input type="text" value={settings.cnpj} onChange={e => setSettings({ ...settings, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                            </div>
                        </section>

                        <section className="form-section">
                            <div className="section-title-sm">
                                <MapPin size={16} />
                                <span>Localização da Sede Administrativa</span>
                            </div>
                            <div className="input-group">
                                <div className="input-field">
                                    <label>CEP</label>
                                    <div className="cep-input-wrapper">
                                        <input type="text" value={settings.address_cep} onChange={e => setSettings({ ...settings, address_cep: e.target.value })} onBlur={handleCEPBlur} placeholder="00000-000" required />
                                        <Search size={16} className="search-icon" />
                                    </div>
                                </div>
                                <div className="input-field" style={{ flex: 2 }}>
                                    <label>Logradouro</label>
                                    <input type="text" value={settings.address_street} onChange={e => setSettings({ ...settings, address_street: e.target.value })} placeholder="Rua, Av..." required />
                                </div>
                            </div>
                            <div className="input-group">
                                <div className="input-field">
                                    <label>Número</label>
                                    <input type="text" value={settings.address_number} onChange={e => setSettings({ ...settings, address_number: e.target.value })} placeholder="123" required />
                                </div>
                                <div className="input-field">
                                    <label>Bairro</label>
                                    <input type="text" value={settings.address_neighborhood} onChange={e => setSettings({ ...settings, address_neighborhood: e.target.value })} placeholder="Ex: Centro" required />
                                </div>
                            </div>
                            <div className="input-group">
                                <div className="input-field">
                                    <label>Cidade</label>
                                    <input type="text" value={settings.address_city} onChange={e => setSettings({ ...settings, address_city: e.target.value })} placeholder="Cidade" required />
                                </div>
                                <div className="input-field">
                                    <label>Estado (UF)</label>
                                    <input type="text" value={settings.address_state} onChange={e => setSettings({ ...settings, address_state: e.target.value })} placeholder="EX: SP" required />
                                </div>
                            </div>
                        </section>

                        <div className="form-footer">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                <Save size={18} /> {loading ? 'Salvando...' : 'Atualizar'}
                            </button>
                        </div>
                    </form>
                </main>

                <aside className="settings-sidebar">
                    <div className="premium-card logo-upload-card">
                        <div className="section-title-sm">
                            <Globe size={16} />
                            <span>Branding & Logo</span>
                        </div>
                        <div className="logo-preview-box">
                            {settings.logo_url ? (
                                <img src={settings.logo_url} alt="Logo Preview" />
                            ) : (
                                <div className="logo-placeholder">
                                    <Upload size={32} color="var(--text-muted)" />
                                    <span>Nenhum logo definido</span>
                                </div>
                            )}
                        </div>
                        <div className="upload-btn-wrapper">
                            <label className="btn-ghost w-full cursor-pointer flex items-center justify-center gap-2">
                                <Upload size={18} />
                                {loading ? 'Enviando...' : 'Selecionar Imagem'}
                                <input type="file" accept="image/*" onChange={handleFileUpload} hidden disabled={loading} />
                            </label>
                        </div>
                        <p className="hint">Use imagens com fundo transparente (PNG/SVG) para melhor resultado.</p>
                    </div>

                    <div className="security-info premium-card">
                        <ShieldCheck size={24} color="var(--primary)" />
                        <strong>Zona de Segurança</strong>
                        <p>Todas as alterações de configurações são auditadas e registradas no log master do sistema.</p>
                    </div>

                    {/* IMPRESSOS */}
                    <div className="premium-card impressos-card">
                        <div className="section-title-sm" style={{ marginBottom: '20px' }}>
                            <FileText size={16} />
                            <span>Impressos</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
                            Escolha quais informações devem aparecer nos PDFs gerados pelo sistema.
                        </p>

                        <div className="toggle-row" onClick={() => setSettings({ ...settings, pdf_show_site_address: !settings.pdf_show_site_address })}>
                            <div className="toggle-info">
                                <span className="toggle-label">Nome e endereço da obra</span>
                                <span className="toggle-desc">Exibe o canteiro e endereço completo no cabeçalho do PDF</span>
                            </div>
                            <div className={`toggle-btn ${settings.pdf_show_site_address ? 'on' : 'off'}`}>
                                {settings.pdf_show_site_address
                                    ? <ToggleRight size={32} />
                                    : <ToggleLeft size={32} />}
                            </div>
                        </div>
                    </div>

                    {/* PERMISSÕES POR OBRA */}
                    <div className="premium-card permissions-card">
                        <div className="section-title-sm" style={{ marginBottom: '20px' }}>
                            <ShieldCheck size={16} />
                            <span>Controle de Campo</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Defina se o encarregado pode cadastrar novos insumos em cada obra.
                        </p>

                        <div className="sites-permissions-list">
                            {sites.map(site => {
                                const allowed = site.settings?.allow_custom_materials ?? true;
                                return (
                                    <div key={site.id} className="site-perm-item" onClick={() => toggleSitePermission(site.id, site.settings)}>
                                        <div className="site-info-min">
                                            <strong>{site.name}</strong>
                                            <span>Insumos Avulsos: {allowed ? 'Liberado' : 'Bloqueado'}</span>
                                        </div>
                                        <div className={`toggle-switch-compact ${allowed ? 'on' : 'off'}`}>
                                            <div className="switch-knob" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>

            <style>{`
        .settings-view { display: flex; flex-direction: column; gap: 40px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; }
        
        .status-indicator { display: flex; align-items: center; gap: 8px; color: var(--status-approved); font-size: 13px; font-weight: 600; opacity: 0; transform: translateY(10px); transition: 0.3s; }
        .status-indicator.active { opacity: 1; transform: translateY(0); }

        .settings-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
        
        .form-section { margin-bottom: 40px; }
        .section-title-sm { display: flex; align-items: center; gap: 10px; color: var(--primary); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
        
        .input-group { display: flex; gap: 20px; }
        .input-field { margin-bottom: 24px; flex: 1; }
        .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        .input-field input { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); outline: none; transition: 0.3s; font-size: 14px; }
        .input-field input:focus { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }
        
        .cep-input-wrapper { position: relative; }
        .cep-input-wrapper .search-icon { position: absolute; right: 14px; top: 14px; color: var(--text-muted); }

        .form-footer { display: flex; justify-content: flex-end; padding-top: 24px; border-top: 1px solid var(--border); }

        .logo-upload-card { margin-bottom: 24px; }
        .logo-preview-box { height: 160px; background: var(--bg-input); border: 1.5px dashed var(--border); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; overflow: hidden; }
        .logo-preview-box img { max-width: 80%; max-height: 80%; object-fit: contain; }
        .logo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); font-size: 12px; }
        .hint { font-size: 11px; color: var(--text-muted); line-height: 1.5; margin-top: 12px; }

        .security-info { display: flex; flex-direction: column; gap: 12px; background: var(--primary-glow); margin-bottom: 24px; }
        .security-info strong { font-size: 14px; color: var(--primary); }
        .security-info p { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

        .impressos-card { display: flex; flex-direction: column; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 14px; cursor: pointer; transition: 0.2s; }
        .toggle-row:hover { border-color: var(--primary); background: var(--primary-glow); }
        .toggle-info { display: flex; flex-direction: column; gap: 4px; }
        .toggle-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .toggle-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
        .toggle-btn { flex-shrink: 0; transition: 0.2s; }
        .toggle-btn.on { color: var(--primary); }
        .toggle-btn.off { color: var(--text-muted); }

        .permissions-card { margin-top: 0; }
        .sites-permissions-list { display: flex; flex-direction: column; gap: 8px; }
        .site-perm-item { 
            display: flex; align-items: center; justify-content: space-between; 
            padding: 10px 14px; background: rgba(255,255,255,0.02); 
            border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: 0.2s;
        }
        .site-perm-item:hover { border-color: var(--primary); }
        .site-info-min { display: flex; flex-direction: column; gap: 2px; }
        .site-info-min strong { font-size: 13px; color: var(--text-primary); }
        .site-info-min span { font-size: 10px; color: var(--text-muted); }
        
        .toggle-switch-compact { width: 34px; height: 18px; background: var(--border); border-radius: 100px; position: relative; transition: 0.3s; }
        .toggle-switch-compact.on { background: var(--primary); }
        .switch-knob { width: 14px; height: 14px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
        .toggle-switch-compact.on .switch-knob { left: 18px; }

        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr; }
          .view-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .input-group { flex-direction: column; gap: 0; }
          .page-title { font-size: 22px; }
          .settings-sidebar { order: -1; }
          .logo-preview-box { height: 120px; }
        }
      `}</style>
        </div>
    );
};

export default AdminSettings;
