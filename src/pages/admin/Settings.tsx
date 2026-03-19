import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, MapPin, Globe, Save, CheckCircle2, Star, FileText, Package } from 'lucide-react';
import StandardCard from '../../components/ui/StandardCard';
import { sanitizeInput, validateFileUpload, generateSecureFileName } from '../../lib/security';

const AdminSettings = ({ profile }: { profile: any }) => {
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
        logo_url: '', // Agora vai guardar o path do arquivo (ex: "uuid.png")
        pdf_show_site_address: true,
        allow_custom_materials_global: false
    });
    
    // Novo estado seguro para a Signed URL (URL temporária do Storage Privado)
    const [signedLogoUrl, setSignedLogoUrl] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('company_settings').select('*').maybeSingle();
        if (data) {
            setSettings({ ...settings, ...data });
            if (data.logo_url && !data.logo_url.startsWith('data:')) {
                // É um caminho de storage privado, precisamos gerar a Signed URL
                const { data: signed } = await supabase.storage.from('secure-assets').createSignedUrl(data.logo_url, 3600);
                if (signed) setSignedLogoUrl(signed.signedUrl);
            } else if (data.logo_url) {
                // Compatibilidade legada com Base64
                setSignedLogoUrl(data.logo_url);
            }
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // [SEGURANÇA] Sanitizando antes de salvar
            const safeSettings = {
                ...settings,
                organization_id: profile.organization_id,
                company_name: sanitizeInput(settings.company_name),
                address_street: sanitizeInput(settings.address_street),
                address_neighborhood: sanitizeInput(settings.address_neighborhood),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('company_settings').upsert(safeSettings);
            if (error) throw error;
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert('Erro de segurança ou falha de conexão: ' + err.message);
        } finally {
            setLoading(false);
        }
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

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            // [SEGURANÇA] Validar MIME type e Tamanho máximo (Max 2MB para Logo)
            validateFileUpload(file, { maxSizeMB: 2 });

            // [SEGURANÇA] Renomeação para UUID impenetrável
            const securePath = generateSecureFileName(file.name);

            // [SEGURANÇA] Upload para bucket privado
            const { error: uploadError } = await supabase.storage.from('secure-assets').upload(securePath, file);
            if (uploadError) throw uploadError;

            // Sucesso: salvamos o path seguro no banco, não o base64
            setSettings({ ...settings, logo_url: securePath });
            
            // Geramos a Signed URL em tempo real para exibir o preview pro usuário
            const { data } = await supabase.storage.from('secure-assets').createSignedUrl(securePath, 3600);
            if (data) setSignedLogoUrl(data.signedUrl);
            
            alert('Arquivo seguro processado com sucesso. Lembre-se de "Salvar Alterações".');
        } catch (err: any) {
            alert('Falha de Segurança no Upload: ' + err.message);
        } finally {
            setLoading(false);
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

                    <StandardCard title="Preferências de Pedidos" subtitle="Controle como as solicitações são feitas em campo.">
                         <div className="toggle-item" style={{ marginBottom: '16px' }}>
                            <div>
                                <strong>Permitir itens fora do catálogo</strong>
                                <p>Habilita o botão "+ Outro Item" para que o operário solicite materiais não cadastrados.</p>
                            </div>
                            <input type="checkbox" className="ios-toggle" checked={settings.allow_custom_materials_global} onChange={e => setSettings({...settings, allow_custom_materials_global: e.target.checked})} />
                        </div>
                        <div className="toggle-item">
                            <div>
                                <strong>Exibir endereço da obra nos pedidos</strong>
                                <p>Inclui o endereço completo da obra no cabeçalho dos PDFs.</p>
                            </div>
                            <input type="checkbox" className="ios-toggle" checked={settings.pdf_show_site_address} onChange={e => setSettings({...settings, pdf_show_site_address: e.target.checked})} />
                        </div>
                    </StandardCard>
                </div>

                <div className="side-column">
                    <StandardCard title="Identidade Visual" subtitle="Faça upload do logotipo da empresa.">
                        <div className="logo-upload-container">
                            <div className="logo-preview">
                                {signedLogoUrl ? (
                                    <img src={signedLogoUrl} alt="Logo da Empresa" />
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
