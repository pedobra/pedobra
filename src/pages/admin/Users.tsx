import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Mail, Shield, User, Edit2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*, sites(name)');
        if (data) {
            setUsers(data.filter((u: any) => u.email !== 'master@master.com'));
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Remover este usuário do ecossistema?')) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) fetchUsers();
    };

    return (
        <div className="users-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Usuários</h1>
                    <p className="page-subtitle">Controle de acessos, funções e vínculos operacionais.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-primary" onClick={() => navigate('/admin/usuarios/novo')}>
                        <UserPlus size={20} /> Convidar Membro
                    </button>
                </div>
            </header>

            <StandardCard 
                title="Membros da Organização" 
                subtitle={`Atualmente existem ${users.length} profissionais ativos no sistema.`}
            >
                <ModernTable headers={['Membro', 'Nível de Acesso', 'Obra Vinculada', 'Ações']}>
                    {users.map(user => (
                        <tr key={user.id} className="clickable-row" onClick={() => navigate(`/admin/usuarios/editar/${user.id}`)}>
                            <td>
                                <div className="user-cell">
                                    <div className="avatar">{user.name?.charAt(0) || 'U'}</div>
                                    <div>
                                        <strong>{user.name}</strong>
                                        <div className="user-email"><Mail size={10} /> {user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className={`role-badge ${user.role}`}>
                                    {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                                    {user.role === 'admin' ? 'Administrador' : 'Operacional'}
                                </div>
                            </td>
                            <td>
                                {user.sites?.name ? (
                                    <div className="site-link">
                                        <Building2 size={12} /> {user.sites.name}
                                    </div>
                                ) : <span className="text-muted">—</span>}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="action-btns" onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn" onClick={() => navigate(`/admin/usuarios/editar/${user.id}`)}><Edit2 size={14} /></button>
                                    <button className="icon-btn delete" onClick={(e) => handleDelete(user.id, e)}><Trash2 size={14} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </ModernTable>
            </StandardCard>

            <style>{`
                .users-view { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .user-cell { display: flex; align-items: center; gap: 12px; }
                .avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--bg-dark); border: 1px solid var(--border); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
                .user-email { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
                
                .role-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); }
                .role-badge.admin { background: var(--primary-glow); color: var(--primary); }
                .role-badge.worker { background: var(--bg-dark); color: var(--text-secondary); }
                
                .site-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-primary); font-weight: 500; }
                .action-btns { display: flex; gap: 8px; justify-content: flex-end; }
                .icon-btn { background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .icon-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
                .icon-btn.delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }
            `}</style>
        </div>
    );
};

export default AdminUsers;
