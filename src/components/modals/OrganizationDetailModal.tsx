import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Info, Building, Users, Globe, Shield, Trash2, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import { maskCNPJ, maskCEP, maskPhone } from '../../lib/masks';
import ModernTable from '../ui/ModernTable';

interface OrganizationDetailModalProps {
    organization: any;
    onClose: () => void;
    onUpdate: () => void;
}

const OrganizationDetailModal = ({ organization, onClose, onUpdate }: OrganizationDetailModalProps) => {
    const [activeTab, setActiveTab] = useState<'geral' | 'empresa' | 'usuarios'>('geral');
    const [loading, setLoading] = useState(false);
    const [orgUsers, setOrgUsers] = useState<any[]>([]);
    const [companySettings, setCompanySettings] = useState<any>(null);
    const [signedLogoUrl, setSignedLogoUrl] = useState('');
    const [trialEndDate, setTrialEndDate] = useState(organization.trial_end?.split('T')[0] || '');

    useEffect(() => {
        if (activeTab === 'usuarios') fetchUsers();
        if (activeTab === 'empresa' && !companySettings) fetchCompanySettings();
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', organization.id)
                .order('name');
            if (error) throw error;
            setOrgUsers(data || []);
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanySettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .eq('organization_id', organization.id)
                .maybeSingle();
            
            if (error) throw error;
            if (data) {
                setCompanySettings(data);
                if (data.logo_url) {
                    const { data: signed } = await supabase.storage.from('secure-assets').createSignedUrl(data.logo_url, 3600);
                    if (signed) setSignedLogoUrl(signed.signedUrl);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTrial = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ trial_end: new Date(trialEndDate).toISOString() })
                .eq('id', organization.id);
            if (error) throw error;
            alert('Expiração atualizada!');
            onUpdate();
        } catch (err: any) {
            alert('Erro ao atualizar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUserStatus = async (user: any) => {
        const newStatus = !user.is_active;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: newStatus })
                .eq('id', user.id);
            if (error) throw error;
            fetchUsers();
        } catch (err: any) {
            alert('Erro ao alterar status: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Excluir este usuário do banco de dados? Esta ação é irreversível.')) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            fetchUsers();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    const getRemainingDays = (endDate: string | null) => {
        if (!endDate) return 0;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '20px' }}>
            <div className="modal-container-elite animate-scale-up" style={{ width: '100%', maxWidth: '900px', height: '600px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
                <header style={{ padding: '24px', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid rgba(255,215,0,0.2)' }}>
                            <Building size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'white' }}>{organization.name}</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>ID: {organization.id.substring(0, 8)}... • Slug: {organization.slug || 'N/A'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
                        <X size={20} />
                    </button>
                </header>

                <nav style={{ padding: '0 24px', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px' }}>
                    {[
                        { id: 'geral', label: 'Resumo Geral', icon: <Info size={16} /> },
                        { id: 'empresa', label: 'Dados da Empresa', icon: <Globe size={16} /> },
                        { id: 'usuarios', label: 'Usuários Registrados', icon: <Users size={16} /> }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 4px', background: 'none', border: 'none',
                                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
                                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '13px', cursor: 'pointer', transition: '0.2s'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>

                <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    {activeTab === 'geral' && (
                        <div className="tab-geral animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                            <div className="info-section">
                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Informações de Assinatura</h4>
                                <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Status Atual</span>
                                        <span style={{ color: organization.subscription_status === 'active' ? 'var(--status-active)' : '#3b82f6', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                                            {organization.subscription_status || 'Trialing'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Plano Ativo</span>
                                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{organization.plan_id?.toUpperCase() || 'TRIAL'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Data de Cadastro</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(organization.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="expiry-section">
                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Gestão de Expiração</h4>
                                <div style={{ background: 'var(--bg-dark)', border: '1.5px solid var(--primary)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '42px', fontWeight: 950, color: 'var(--primary)', marginBottom: '8px' }}>
                                        {getRemainingDays(organization.trial_end)}
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Dias restantes</p>
                                    
                                    <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>ALTERAR DATA FINAL</label>
                                        <input 
                                            type="date" 
                                            value={trialEndDate}
                                            onChange={e => setTrialEndDate(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleUpdateTrial}
                                        disabled={loading}
                                        className="btn-primary w-full" 
                                        style={{ background: 'var(--primary)', color: 'black', fontWeight: 800, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%' }}
                                    >
                                        Atualizar Prazo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'empresa' && (
                        <div className="tab-empresa animate-fade-in">
                            {!companySettings ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    {loading ? 'Buscando dados...' : 'Nenhum dado empresarial preenchido ainda.'}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                                    <div className="logo-card" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '100%', height: '140px', background: 'black', borderRadius: '12px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {signedLogoUrl ? <img src={signedLogoUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>SEM LOGO</span>}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <strong style={{ display: 'block', fontSize: '14px' }}>{companySettings.company_name}</strong>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{maskCNPJ(companySettings.cnpj || '')}</span>
                                        </div>
                                    </div>

                                    <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {[
                                            { label: 'E-mail', value: companySettings.email },
                                            { label: 'Website', value: companySettings.website, isLink: true },
                                            { label: 'WhatsApp', value: maskPhone(companySettings.whatsapp || '') },
                                            { label: 'Instagram', value: companySettings.instagram },
                                            { label: 'CEP', value: maskCEP(companySettings.address_cep || '') },
                                            { label: 'Endereço', value: `${companySettings.address_street}, ${companySettings.address_number}`, full: true },
                                            { label: 'Bairro/Cidade', value: `${companySettings.address_neighborhood} - ${companySettings.address_city}` }
                                        ].map((item, i) => (
                                            <div key={i} style={{ gridColumn: item.full ? 'span 2' : 'auto' }}>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>{item.label}</label>
                                                {item.isLink ? (
                                                    <a href={item.value?.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" style={{ color: 'var(--primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                                        {item.value || '—'} <ExternalLink size={10} />
                                                    </a>
                                                ) : <div style={{ fontSize: '13px', color: 'white' }}>{item.value || '—'}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'usuarios' && (
                        <div className="tab-usuarios animate-fade-in" style={{ height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>Todos os Membros</h4>
                                <span style={{ fontSize: '12px', background: 'rgba(255,215,0,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6x', fontWeight: 800 }}>{orgUsers.length} TOTAL</span>
                            </div>
                            
                            <div style={{ height: 'calc(100% - 60px)', minHeight: '300px' }}>
                                <ModernTable 
                                    columns={[
                                        { header: 'Membro', align: 'left', accessor: (u: any) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>{u.name?.charAt(0)}</div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{u.name}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.email}</div>
                                                </div>
                                            </div>
                                        )},
                                        { header: 'Cargo', accessor: (u: any) => <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: u.role === 'admin' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>{u.role?.toUpperCase()}</span> },
                                        { header: 'Status', accessor: (u: any) => <span style={{ color: u.is_active ? 'var(--status-active)' : 'var(--status-cancelled)', fontSize: '12px', fontWeight: 700 }}>{u.is_active ? 'Ativo' : 'Bloqueado'}</span> },
                                        { header: 'Ações', align: 'right', accessor: (u: any) => (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => handleToggleUserStatus(u)}
                                                    className="icon-btn" 
                                                    style={{ color: u.is_active ? '#f59e0b' : '#3b82f6' }}
                                                    title={u.is_active ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                                                >
                                                    {u.is_active ? <UserMinus size={16} /> : <UserPlus size={16} />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="icon-btn delete" 
                                                    style={{ color: 'var(--status-cancelled)' }}
                                                    title="Excluir do Banco"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    ]}
                                    data={orgUsers}
                                    loading={loading}
                                    rowHeight={48}
                                />
                            </div>
                        </div>
                    )}
                </main>

                <footer style={{ padding: '20px 32px', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Shield size={14} /> Somente Master Admin tem acesso a este painel.
                    </div>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '0 24px', height: '40px' }}>Fechar Ficha</button>
                </footer>
            </div>

            <style>{`
                .modal-container-elite { max-height: 90vh; }
                .icon-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
                .icon-btn:hover { background: var(--bg-dark); transform: scale(1.05); }
                .icon-btn.delete:hover { border-color: var(--status-cancelled); background: rgba(var(--status-denied-rgb), 0.1); }
            `}</style>
        </div>
    );
};

export default OrganizationDetailModal;
