import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useSubscription } from '../../../hooks/useSubscription';
import { Save, ArrowLeft, Mail, Shield, Building2, Lock, User, CheckCircle } from 'lucide-react';
import StandardCard from '../../../components/ui/StandardCard';
import { sanitizeInput, securitySchemas } from '../../../lib/security';
import { maskCPF } from '../../../lib/masks';

const UserFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { maxWorkers } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [obras, setObras] = useState<any[]>([]);
    const [adminProfile, setAdminProfile] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'worker',
        site_id: '',
        cpf: ''
    });

    useEffect(() => {
        fetchAdminProfile();
        fetchObras();
        if (id) fetchUser();
    }, [id]);

    const fetchAdminProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setAdminProfile(data);
        }
    };

    const fetchObras = async () => {
        const { data } = await supabase.from('sites').select('*').order('name');
        if (data) setObras(data);
    };

    const fetchUser = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) setFormData({ 
            ...formData, 
            name: data.name, 
            email: data.email, 
            role: data.role, 
            site_id: data.site_id || '',
            cpf: maskCPF(data.cpf || '')
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!id && formData.role === 'worker') {
                // Check limits for new worker
                const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker');

                if (count !== null && count >= (maxWorkers || 1)) {
                    throw new Error(`Limite de operários do seu plano atingido (${count}/${maxWorkers}). Faça upgrade para adicionar mais.`);
                }
            }

            // [SEGURANÇA] Sanitizando e Validando
            const safeName = sanitizeInput(formData.name);
            if (!safeName) throw new Error("Nome inválido.");
            
            const validEmail = securitySchemas.email.parse(formData.email);

            if (id) {
                // Update profile only (cannot change password/email easily via client)
                const { error } = await supabase.from('profiles').update({
                    name: safeName,
                    role: formData.role,
                    site_id: formData.role === 'worker' ? formData.site_id : null,
                    cpf: formData.cpf
                }).eq('id', id);
                if (error) throw error;
            } else {
                // New User requires temporary client to avoid logout
                const tempSupabase = (await import('@supabase/supabase-js')).createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY,
                    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
                );

                const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                    email: validEmail,
                    password: formData.password,
                    options: { data: { name: safeName } }
                });

                if (authError) throw authError;

                if (authData.user) {
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: authData.user.id,
                        name: safeName,
                        email: validEmail,
                        role: formData.role,
                        site_id: formData.role === 'worker' ? formData.site_id : null,
                        cpf: formData.cpf,
                        organization_id: adminProfile?.organization_id
                    });
                    if (profileError) throw profileError;
                }
            }

            navigate('/admin/users');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="user-form-page">
            <header className="view-header">
                <button onClick={() => navigate('/admin/users')} className="btn-back">
                    <ArrowLeft size={18} /> Voltar
                </button>
                <div className="header-info">
                    <h1 className="page-title">{id ? 'Editar Membro' : 'Registrar Novo Membro'}</h1>
                    <p className="page-subtitle">Atribua funções e vincule profissionais a obras específicas.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="form-grid">
                <div className="main-column">
                    <StandardCard title="Informações de Acesso" subtitle="Dados básicos do profissional.">
                        <div className="input-group">
                            <label><User size={14} /> Nome Completo</label>
                            <input type="text" required className="form-input" placeholder="Ex: João da Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>

                        <div className="input-group">
                            <label><Shield size={14} /> CPF (Opcional)</label>
                            <input type="text" className="form-input" placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})} />
                        </div>

                        <div className="input-row">
                            <div className="input-group flex-1">
                                <label><Mail size={14} /> E-mail Profissional</label>
                                <input type="email" required disabled={!!id} className="form-input" placeholder="email@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            {!id && (
                                <div className="input-group flex-1">
                                    <label><Lock size={14} /> Senha Temporária</label>
                                    <input type="password" required className="form-input" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                            )}
                        </div>
                    </StandardCard>

                    <StandardCard title="Segurança e Acesso" subtitle="Nível de permissão no ecossistema.">
                        <div className="role-selector">
                            <div className={`role-card ${formData.role === 'admin' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'admin'})}>
                                <Shield className="role-icon" />
                                <div>
                                    <strong>Administrador</strong>
                                    <p>Acesso total ao sistema, financeiro e relatórios.</p>
                                </div>
                                {formData.role === 'admin' && <CheckCircle className="check-icon" />}
                            </div>
                            <div className={`role-card ${formData.role === 'worker' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'worker'})}>
                                <User className="role-icon" />
                                <div>
                                    <strong>Operacional</strong>
                                    <p>Atua em campo, recebe materiais e solicita insumos.</p>
                                </div>
                                {formData.role === 'worker' && <CheckCircle className="check-icon" />}
                            </div>
                        </div>

                        {formData.role === 'worker' && (
                            <div className="site-link animate-fade">
                                <label><Building2 size={14} /> Vincular à Obra</label>
                                <div className="site-selector">
                                    {obras.length === 0 ? (
                                        <p className="no-obras">Nenhuma obra ativa encontrada.</p>
                                    ) : (
                                        obras.map(o => (
                                            <div 
                                                key={o.id} 
                                                className={`site-card ${formData.site_id === o.id ? 'active' : ''}`}
                                                onClick={() => setFormData({...formData, site_id: o.id})}
                                            >
                                                <Building2 className="site-icon" size={18} />
                                                <div className="site-info">
                                                    <strong>{o.name}</strong>
                                                    <p>{o.address?.city || 'Local não definido'}</p>
                                                </div>
                                                {formData.site_id === o.id && <CheckCircle className="check-icon" size={16} />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </StandardCard>
                </div>

                <div className="side-column">
                    <StandardCard title="Confirmar Cadastro" subtitle="Checklist de segurança.">
                        <ul className="checklist">
                            <li><CheckCircle size={14} color="var(--primary)" /> Perfil isolado por Organização</li>
                            <li><CheckCircle size={14} color="var(--primary)" /> Log de auditoria ativado</li>
                            <li><CheckCircle size={14} color="var(--primary)" /> {id ? 'Dados atualizados instantaneamente' : 'Acesso registrado no sistema'}</li>
                        </ul>
                        <button type="submit" className="btn-primary w-full mt-6" disabled={loading}>
                            <Save size={18} /> {loading ? 'Gerando Acesso...' : (id ? 'Salvar Perfil' : 'Finalizar Cadastro')}
                        </button>
                    </StandardCard>
                </div>
            </form>

            <style>{`
                .user-form-page { display: flex; flex-direction: column; gap: 32px; max-width: 1000px; margin: 0 auto; }
                .view-header { display: flex; align-items: center; gap: 24px; }
                .btn-back { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); height: 44px; padding: 0 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; transition: 0.2s; }
                .btn-back:hover { border-color: var(--text-primary); color: var(--text-primary); }
                
                .form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
                .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
                .input-group label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; }
                .input-row { display: flex; gap: 16px; }
                .flex-1 { flex: 1; }
                
                .role-selector { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
                .role-card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; cursor: pointer; position: relative; transition: 0.3s; }
                .role-card:hover { border-color: var(--primary); background: rgba(255,215,0,0.02); }
                .role-card.active { border-color: var(--primary); background: var(--primary-glow); }
                .role-icon { color: var(--text-muted); transition: 0.3s; }
                .role-card.active .role-icon { color: var(--primary); }
                .role-card strong { display: block; font-size: 15px; color: var(--text-primary); }
                .role-card p { font-size: 12px; color: var(--text-secondary); margin: 0; }
                .check-icon { position: absolute; right: 16px; color: var(--primary); }
                
                .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
                .checklist li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
                .w-full { width: 100%; }
                .mt-6 { margin-top: 24px; }
                
                .site-link { padding-top: 16px; border-top: 1px solid var(--border); }
                .site-selector { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
                .site-card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; position: relative; transition: 0.2s; }
                .site-card:hover { border-color: var(--primary); background: rgba(255,215,0,0.02); }
                .site-card.active { border-color: var(--primary); background: var(--primary-glow); }
                .site-icon { color: var(--text-muted); transition: 0.3s; }
                .site-card.active .site-icon { color: var(--primary); }
                .site-info strong { font-size: 13px; color: var(--text-primary); display: block; }
                .site-info p { font-size: 11px; color: var(--text-muted); margin: 0; }
                .no-obras { font-size: 13px; color: var(--text-muted); padding: 20px; text-align: center; border: 1px dashed var(--border); border-radius: 12px; width: 100%; }

                .animate-fade { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                @media (max-width: 800px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .site-selector { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default UserFormPage;
