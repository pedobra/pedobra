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
    ToggleRight,
    CreditCard,
    Calendar,
    Zap,
    Crown
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

const AdminSettings = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'subscription'>('general');
    const { isTrial, daysRemaining, planId, organizationName, loading: subLoading } = useSubscription();
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
    const [siteSearchTerm, setSiteSearchTerm] = useState('');

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

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
                    <h1 className="page-title">Configurações</h1>
                    <p className="page-subtitle">Gerencie sua conta, equipe e assinatura.</p>
                </div>
                <div className="header-actions">
                    <div className={`status-indicator ${success ? 'active' : ''}`}>
                        <CheckCircle2 size={16} />
                        <span>Atualizado com Sucesso</span>
                    </div>
                </div>
            </header>

            <nav className="settings-tabs">
                <button className={`tab-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                    <Building size={18} /> <span>Geral</span>
                </button>
                <button className={`tab-item ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
                    <ShieldCheck size={18} /> <span>Campo & Impressos</span>
                </button>
                <button className={`tab-item ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>
                    <CreditCard size={18} /> <span>Assinatura</span>
                </button>
            </nav>

            {activeTab === 'general' && (
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
                    </aside>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="settings-grid">
                    <main className="settings-main-form">
                         <div className="premium-card">
                            <div className="section-title-sm">
                                <FileText size={16} />
                                <span>Configurações de Impressos</span>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                Personalize as informações exibidas nos documentos PDF gerados pelo sistema.
                            </p>

                            <div className="toggle-row" onClick={() => setSettings({ ...settings, pdf_show_site_address: !settings.pdf_show_site_address })}>
                                <div className="toggle-info">
                                    <span className="toggle-label">Nome e endereço da obra no PDF</span>
                                    <span className="toggle-desc">Exibe o cabeçalho completo da obra nos relatórios de pedidos.</span>
                                </div>
                                <div className={`toggle-btn ${settings.pdf_show_site_address ? 'on' : 'off'}`}>
                                    {settings.pdf_show_site_address
                                        ? <ToggleRight size={32} />
                                        : <ToggleLeft size={32} />}
                                </div>
                            </div>
                            
                            <div className="form-footer" style={{ marginTop: '40px' }}>
                                <button onClick={() => handleSubmit()} className="btn-primary" disabled={loading}>
                                    <Save size={18} /> Salvar Preferências
                                </button>
                            </div>
                        </div>
                    </main>

                    <aside className="settings-sidebar">
                         <div className="premium-card">
                            <div className="section-title-sm">
                                <ShieldCheck size={16} />
                                <span>Permissões por Obra</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Controle individual de permissão para novos insumos.
                            </p>
                            <div className="site-search-wrapper">
                                <Search size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar obra..."
                                    value={siteSearchTerm}
                                    onChange={e => setSiteSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="sites-permissions-scroll" style={{ maxHeight: '400px' }}>
                                <div className="sites-permissions-list">
                                    {sites
                                        .filter(site => site.name.toLowerCase().includes(siteSearchTerm.toLowerCase()))
                                        .map(site => {
                                            const allowed = site.settings?.allow_custom_materials ?? true;
                                            return (
                                                <div key={site.id} className="site-perm-item" onClick={() => toggleSitePermission(site.id, site.settings)}>
                                                    <div className="site-info-min">
                                                        <strong>{site.name}</strong>
                                                        <span>{allowed ? 'Livre' : 'Restrito'}</span>
                                                    </div>
                                                    <div className={`toggle-switch-compact ${allowed ? 'on' : 'off'}`}>
                                                        <div className="switch-knob" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                         </div>
                    </aside>
                </div>
            )}

            {activeTab === 'subscription' && (
                <div className="subscription-view">
                    <div className="subscription-hero premium-card">
                        <div className="sub-header">
                            <div className="plan-badge">
                                <Crown size={20} />
                                <span>PLANO {planId?.toUpperCase() || 'TRIAL'}</span>
                            </div>
                            <h2>{organizationName || 'Carregando...'}</h2>
                        </div>

                        <div className="sub-details-grid">
                            <div className="sub-stat">
                                <Calendar size={20} />
                                <div className="stat-info">
                                    <label>Status da Conta</label>
                                    <strong>{isTrial ? 'Período de Teste' : 'Assinatura Ativa'}</strong>
                                </div>
                            </div>
                            <div className="sub-stat">
                                <Zap size={20} />
                                <div className="stat-info">
                                    <label>Tempo Restante</label>
                                    <strong>{daysRemaining} dias</strong>
                                </div>
                            </div>
                        </div>

                        <div className="sub-actions">
                            <button className="btn-primary" onClick={() => alert('Em breve: Integração com Stripe Checkout')}>
                                <Zap size={18} /> Fazer Upgrade para Pro
                            </button>
                        </div>
                    </div>

                    <div className="plans-comparison-grid">
                        <div className="plan-card">
                            <h3>Básico (Free)</h3>
                            <p className="price">R$ 0<span>/mês</span></p>
                            <ul>
                                <li>Até 1 Obra ativa</li>
                                <li>Limite de 5 fornecedores</li>
                                <li>Suporte via Email</li>
                            </ul>
                            <button className="btn-ghost w-full">Plano Atual</button>
                        </div>
                        <div className="plan-card popular">
                            <div className="popular-tag">RECOMENDADO</div>
                            <h3>Profissional</h3>
                            <p className="price">R$ 299<span>/mês</span></p>
                            <ul>
                                <li>Obras ilimitadas</li>
                                <li>Fornecedores ilimitados</li>
                                <li>Relatórios Customizados</li>
                                <li>Suporte Prioritário</li>
                            </ul>
                            <button className="btn-primary w-full" onClick={() => alert('Em breve')}>Escolher Plano</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .settings-view { display: flex; flex-direction: column; gap: 20px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
                .page-subtitle { color: var(--text-secondary); font-size: 14px; }
                
                .settings-tabs { display: flex; gap: 12px; margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 2px; }
                .tab-item { 
                    display: flex; align-items: center; gap: 10px; padding: 12px 24px; 
                    background: transparent; border: none; color: var(--text-muted); 
                    cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.3s;
                    border-bottom: 2px solid transparent; margin-bottom: -2px;
                }
                .tab-item:hover { color: var(--text-primary); }
                .tab-item.active { color: var(--primary); border-bottom-color: var(--primary); }

                .settings-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
                .form-section { margin-bottom: 40px; }
                .section-title-sm { display: flex; align-items: center; gap: 10px; color: var(--primary); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
                
                .input-group { display: flex; gap: 20px; }
                .input-field { margin-bottom: 24px; flex: 1; }
                .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
                .input-field input { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); outline: none; transition: 0.3s; font-size: 14px; }
                .input-field input:focus { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }
                
                .subscription-view { display: flex; flex-direction: column; gap: 32px; max-width: 900px; margin: 0 auto; width: 100%; }
                .subscription-hero { padding: 48px; border: 1px solid var(--primary); border-radius: 24px; background: var(--bg-card); position: relative; }
                .plan-badge { 
                    display: inline-flex; align-items: center; gap: 8px; 
                    background: var(--primary-glow); color: var(--primary); 
                    padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 800;
                    margin-bottom: 24px; border: 1px solid var(--primary);
                }
                .sub-header h2 { font-size: 32px; margin-bottom: 32px; color: var(--text-primary); }
                .sub-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
                .sub-stat { display: flex; align-items: center; gap: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 16px; }
                .stat-info label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
                .stat-info strong { font-size: 18px; color: var(--text-primary); }
                
                .plans-comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .plan-card { padding: 32px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; display: flex; flex-direction: column; }
                .plan-card.popular { border-color: var(--primary); background: var(--primary-glow); position: relative; }
                .popular-tag { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 4px 12px; border-radius: 100px; font-size: 10px; font-weight: 800; }
                .plan-card h3 { margin-bottom: 16px; font-size: 20px; }
                .plan-card .price { font-size: 36px; font-weight: 800; margin-bottom: 24px; }
                .plan-card .price span { font-size: 14px; color: var(--text-muted); font-weight: 400; }
                .plan-card ul { list-style: none; margin-bottom: 32px; flex: 1; }
                .plan-card li { margin-bottom: 12px; font-size: 14px; color: var(--text-secondary); display: flex; align-items: center; gap: 10px; }
                .plan-card li::before { content: "✓"; color: var(--primary); font-weight: bold; }

                .site-search-wrapper { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; }
                .site-search-wrapper input { background: transparent; border: none; outline: none; color: var(--text-primary); width: 100%; font-size: 13px; }
                
                .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .toggle-row:hover { border-color: var(--primary); }
                .toggle-info { display: flex; flex-direction: column; gap: 4px; }
                .toggle-label { font-size: 14px; font-weight: 600; }
                .toggle-desc { font-size: 11px; color: var(--text-muted); }
                .toggle-btn { transition: 0.3s; }
                .toggle-btn.on { color: var(--primary); }
                
                .site-perm-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: 0.2s; margin-bottom: 8px; }
                .site-perm-item:hover { border-color: var(--primary); }
                .site-info-min strong { display: block; font-size: 13px; }
                .site-info-min span { font-size: 11px; color: var(--text-muted); }
                
                .toggle-switch-compact { width: 36px; height: 20px; background: var(--border); border-radius: 100px; position: relative; transition: 0.3s; }
                .toggle-switch-compact.on { background: var(--primary); }
                .switch-knob { width: 16px; height: 16px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
                .toggle-switch-compact.on .switch-knob { left: 18px; }

                @media (max-width: 768px) {
                  .settings-grid, .sub-details-grid, .plans-comparison-grid { grid-template-columns: 1fr; }
                  .settings-tabs { overflow-x: auto; white-space: nowrap; }
                }
            `}</style>
        </div>
    );
};

export default AdminSettings;
