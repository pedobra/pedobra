import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Mail, Shield, User, Filter, AlertCircle } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [obras, setObras] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'worker',
        site_id: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchObras();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*, sites(name)');
        if (data) {
            // Hide the system master account from the UI list
            setUsers(data.filter((u: any) => u.email !== 'master@master.com'));
        }
    };

    const fetchObras = async () => {
        const { data } = await supabase.from('sites').select('*');
        if (data) setObras(data);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Isolating the sign-up process in a temporary client 
            // ensures the main client won't be replaced, thus avoiding the admin getting logged out
            const tempSupabase = (await import('@supabase/supabase-js')).createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    site_id: formData.role === 'worker' ? formData.site_id : null
                });
                if (profileError) throw profileError;
            }

            setShowModal(false);
            fetchUsers();
            alert('Membro adicionado ao ecossistema com sucesso.');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="users-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Usuários</h1>
                    <p className="page-subtitle">Personalize permissões e atribua responsabilidades em canteiros específicos.</p>
                </div>
                <div className="header-actions">
                    <div className="filter-group">
                        <button className="filter-btn"><Filter size={18} /> Filtrar</button>
                    </div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <UserPlus size={20} /> Adicionar Novo Membro
                    </button>
                </div>
            </header>

            <div className="premium-table-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>USUÁRIO</th>
                            <th>IDENTIFICAÇÃO</th>
                            <th>CARGO/FUNÇÃO</th>
                            <th>UNIDADE ATRIBUÍDA</th>
                            <th>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-icon">
                                            <User size={16} />
                                        </div>
                                        <div className="user-name-stack">
                                            <strong>{user.name}</strong>
                                            <span>ID: {user.id.slice(0, 6)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="email-cell">
                                        <Mail size={14} color="var(--text-muted)" />
                                        <span>{user.email || 'Não informado'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={`role-pill ${user.role}`}>
                                        {user.role === 'admin' ? (
                                            <><Shield size={12} /> Engenheiro Master</>
                                        ) : (
                                            <><User size={12} /> Operacional</>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="obra-tag">
                                        {user.sites?.name ? (
                                            <>{user.sites.name}</>
                                        ) : (
                                            <span className="unassigned">Administração Geral</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="row-actions">
                                        <button className="icon-btn delete"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay glass" onClick={() => setShowModal(false)}>
                    <div className="modal-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Novo Membro da Equipe</h2>
                            <p>Preencha os dados e selecione o nível de autoridade.</p>
                        </div>

                        <form onSubmit={handleAddUser} className="modal-form">
                            <div className="input-field">
                                <label>Nome Completo do Colaborador</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Roberto Silva" required />
                            </div>
                            <div className="input-group">
                                <div className="input-field">
                                    <label>E-mail Institucional</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="E-mail" required />
                                </div>
                                <div className="input-field">
                                    <label>Senha Provisória</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Senha" required />
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="input-field">
                                    <label>Função no Sistema</label>
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="worker">Operacional / Canteiro</option>
                                        <option value="admin">Administrador Master</option>
                                    </select>
                                </div>
                                {formData.role === 'worker' && (
                                    <div className="input-field">
                                        <label>Vincular a Canteiro de Obra</label>
                                        <select value={formData.site_id} onChange={e => setFormData({ ...formData, site_id: e.target.value })} required>
                                            <option value="">Selecione uma obra</option>
                                            {obras.map(obra => (
                                                <option key={obra.id} value={obra.id}>{obra.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer-info">
                                <AlertCircle size={14} color="var(--primary)" />
                                <span>O colaborador receberá os dados de acesso via sistema.</span>
                            </div>

                            <div className="modal-actions-btns">
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Descartar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Processando...' : 'Confirmar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .users-view { display: flex; flex-direction: column; gap: 40px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; }
        .header-actions { display: flex; gap: 16px; }
        
        .filter-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 12px 20px; border-radius: 12px; color: white; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; }

        .premium-table-card { background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border); overflow: hidden; }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
        .modern-table th { padding: 20px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 20px 24px; font-size: 14px; border-bottom: 1px solid var(--border); }
        .modern-table tr:hover { background: rgba(255,255,255,0.01); }

        .user-cell { display: flex; align-items: center; gap: 14px; }
        .user-icon { width: 32px; height: 32px; background: var(--bg-input); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
        .user-name-stack { display: flex; flex-direction: column; }
        .user-name-stack strong { font-size: 14px; color: white; }
        .user-name-stack span { font-size: 11px; color: var(--text-muted); font-family: monospace; }
        
        .email-cell { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); }

        .role-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .role-pill.admin { background: rgba(255, 215, 0, 0.1); color: var(--primary); }
        .role-pill.worker { background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }

        .obra-tag { font-weight: 600; color: white; }
        .unassigned { color: var(--text-muted); font-weight: 400; font-style: italic; }

        .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: 0.3s; }
        .icon-btn:hover { color: white; }
        .icon-btn.delete:hover { color: var(--status-denied); }

        .modal-card { width: 600px; padding: 48px; border-radius: 32px; }
        .modal-header { margin-bottom: 32px; }
        .modal-header p { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
        .input-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .input-field input, .input-field select { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: white; outline: none; }
        .input-field input:focus, .input-field select:focus { border-color: var(--primary); }
        
        .modal-footer-info { display: flex; align-items: center; gap: 10px; background: rgba(255, 215, 0, 0.05); padding: 12px 16px; border-radius: 12px; font-size: 12px; color: var(--primary); margin-bottom: 32px; }
        .modal-actions-btns { display: flex; justify-content: flex-end; gap: 16px; }
      `}</style>
        </div>
    );
};

export default AdminUsers;
