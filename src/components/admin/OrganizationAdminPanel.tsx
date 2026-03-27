import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    X, Info, Building, Users, Globe, Shield, CreditCard 
} from 'lucide-react';
import { maskCNPJ, maskPhone } from '../../lib/masks';
import ModernTable from '../ui/ModernTable';

interface OrganizationAdminPanelProps {
    organization: any;
    onClose: () => void;
    onUpdate: () => void;
}

const OrganizationAdminPanel = ({ organization, onClose, onUpdate }: OrganizationAdminPanelProps) => {
    const [activeTab, setActiveTab] = useState<'gestao' | 'detalhes' | 'empresa' | 'usuarios'>('gestao');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Manage State
    const [planId, setPlanId] = useState(organization.plan_id || 'trial');
    const [status, setStatus] = useState(organization.subscription_status || 'trialing');
    const [message, setMessage] = useState(organization.system_message || '');
    const messageLevel = organization.system_message_level || 'info';
    const customDays = 30;
    const [customPrice] = useState(organization.custom_plan_price || 0);

    // Detail State
    const [orgUsers, setOrgUsers] = useState<any[]>([]);
    const [companySettings, setCompanySettings] = useState<any>(null);
    const [signedLogoUrl, setSignedLogoUrl] = useState('');
    const [trialEndDate, setTrialEndDate] = useState(organization.trial_end?.split('T')[0] || '');
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'detalhes') fetchRecentPayments();
        if (activeTab === 'usuarios') fetchUsers();
        if (activeTab === 'empresa' && !companySettings) fetchCompanySettings();
    }, [activeTab]);

    const fetchRecentPayments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('organization_id', organization.id)
                .eq('action', 'payment_processed')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            setRecentOrders(data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

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
        } catch (err) { console.error(err); } finally { setLoading(false); }
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
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleSaveManage = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    plan_id: planId,
                    subscription_status: status,
                    system_message: message,
                    system_message_level: messageLevel,
                    custom_plan_price: planId === 'custom' ? customPrice : 0,
                    trial_end: new Date(Date.now() + (planId === 'custom' ? customDays : (planId === 'trial' ? 7 : 30)) * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', organization.id);
            if (error) throw error;
            alert('Organização atualizada!');
            onUpdate();
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const handleUpdateTrialDate = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ trial_end: new Date(trialEndDate).toISOString() })
                .eq('id', organization.id);
            if (error) throw error;
            alert('Expiração atualizada!');
            onUpdate();
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const getRemainingDays = (endDate: string | null) => {
        if (!endDate) return 0;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div style={{ padding: '24px', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid rgba(255,215,0,0.2)' }}>
                        <Shield size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Gestão Administrativa: {organization.name}</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{organization.id} • {organization.owner_email}</p>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                    <X size={18} />
                </button>
            </header>

            <nav style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)' }}>
                {[
                    { id: 'gestao', label: 'Gestão de Planos', icon: <CreditCard size={14} /> },
                    { id: 'detalhes', label: 'Ficha Financeira', icon: <Info size={14} /> },
                    { id: 'empresa', label: 'Dados da Empresa', icon: <Globe size={14} /> },
                    { id: 'usuarios', label: 'Usuários (Membros)', icon: <Users size={14} /> }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{ 
                            padding: '12px 4px', background: 'none', border: 'none',
                            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '12px', cursor: 'pointer', transition: '0.2s',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </nav>

            <main style={{ minHeight: '300px' }}>
                {activeTab === 'gestao' && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Plano Ativo
                                </label>
                                <select 
                                    value={planId} 
                                    onChange={(e) => setPlanId(e.target.value)}
                                    style={{ width: '100%', height: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-primary)' }}
                                >
                                    <option value="trial">Trial (Período de Teste)</option>
                                    <option value="basic">Básico</option>
                                    <option value="pro">Profissional</option>
                                    <option value="custom">Plano Personalizado</option>
                                </select>
                            </div>
                            <div className="field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Status Financeiro
                                </label>
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value)}
                                    style={{ width: '100%', height: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-primary)' }}
                                >
                                    <option value="trialing">Em Teste</option>
                                    <option value="active">Ativo</option>
                                    <option value="past_due">Atrasado</option>
                                    <option value="suspended">Suspenso</option>
                                    <option value="canceled">Cancelado</option>
                                </select>
                            </div>
                            <button onClick={handleSaveManage} disabled={saving} className="btn-primary" style={{ height: '44px', fontWeight: 800, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                {saving ? 'Salvando...' : 'Aplicar Alterações Financeiras'}
                            </button>
                        </section>

                        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Aviso no Dashboard
                                </label>
                                <textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Mensagem imediata para o cliente..."
                                    style={{ width: '100%', minHeight: '100px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', resize: 'none' }}
                                />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'detalhes' && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                        <section>
                            <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>Histórico de Assinaturas</h4>
                            <ModernTable 
                                columns={[
                                    { header: 'Data', accessor: (o: any) => <span style={{ fontWeight: 600 }}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span> },
                                    { header: 'Plano', align: 'center', accessor: (o: any) => <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{o.details?.plan?.toUpperCase()}</span> },
                                    { header: 'Valor', align: 'right', accessor: (o: any) => <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.details?.amount || 0)}</span> }
                                ]}
                                data={recentOrders}
                                loading={loading}
                                rowHeight={36}
                            />
                        </section>

                        <section>
                             <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>Prazo de Expiração</h4>
                             <div style={{ background: 'rgba(255,215,0,0.05)', border: '2px solid var(--primary)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 950, color: 'var(--primary)' }}>{getRemainingDays(organization.trial_end)}</div>
                                <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '16px' }}>DIAS RESTANTES</p>
                                <input 
                                    type="date" 
                                    value={trialEndDate}
                                    onChange={e => setTrialEndDate(e.target.value)}
                                    style={{ width: '100%', marginBottom: '12px', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                                <button onClick={handleUpdateTrialDate} disabled={saving} style={{ width: '100%', padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', color: 'white' }}>
                                    {saving ? 'Gravando...' : 'Ajustar Expiração'}
                                </button>
                             </div>
                        </section>
                    </div>
                )}

                {activeTab === 'empresa' && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px' }}>
                        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ width: '100%', height: '120px', background: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                {signedLogoUrl ? <img src={signedLogoUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Building size={32} opacity={0.2} />}
                            </div>
                            <strong style={{ display: 'block', fontSize: '13px' }}>{companySettings?.company_name || 'N/A'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { l: 'CNPJ', v: maskCNPJ(companySettings?.cnpj || '') },
                                { l: 'WhatsApp', v: maskPhone(companySettings?.whatsapp || '') },
                                { l: 'Endereço', v: `${companySettings?.address_street || ''}, ${companySettings?.address_number || ''}`, full: true },
                                { l: 'Bairro/Cidade', v: `${companySettings?.address_neighborhood || ''} - ${companySettings?.address_city || ''}`, full: true },
                            ].map((it, i) => (
                                <div key={i} style={{ gridColumn: it.full ? 'span 2' : 'auto' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>{it.l}</label>
                                    <span style={{ fontSize: '13px' }}>{it.v || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'usuarios' && (
                    <div className="animate-fade-in">
                        <ModernTable 
                            columns={[
                                { header: 'Membro', align: 'left', accessor: (u: any) => <div><strong>{u.name}</strong><br/><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.email}</span></div> },
                                { header: 'Cargo', accessor: (u: any) => u.role?.toUpperCase() },
                                { header: 'Status', accessor: (u: any) => <span style={{ color: u.is_active ? 'var(--status-active)' : 'var(--status-canceled)' }}>{u.is_active ? 'Ativo' : 'Bloqueado'}</span> }
                            ]}
                            data={orgUsers}
                            loading={loading}
                        />
                    </div>
                )}
            </main>

            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
};

export default OrganizationAdminPanel;
