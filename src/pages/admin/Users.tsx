import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Mail, Shield, User, Edit2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import { maskCPF } from '../../lib/masks';

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { maxWorkers } = useSubscription();

    const workersCount = users.filter(u => u.role === 'worker').length;
    const isLimitReached = maxWorkers ? workersCount >= maxWorkers : false;

    useEffect(() => {
        fetchUsers();
        setSelectedIds([]);
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*, sites(name)');
            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            console.error('Erro:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Remover este usuário do ecossistema?')) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) fetchUsers();
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Deseja excluir permanentemente os ${selectedIds.length} usuários selecionados? Esta ação não pode ser desfeita.`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').delete().in('id', selectedIds);
            if (error) throw error;
            
            setSelectedIds([]);
            fetchUsers();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Membro',
            accessor: (user: any) => (
                <div className="user-cell">
                    <div className="avatar">{user.name?.charAt(0) || 'U'}</div>
                    <div>
                        <strong>{user.name}</strong>
                        <div className="user-email"><Mail size={10} /> {user.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Nível de Acesso',
            accessor: (user: any) => (
                <div className={`role-badge ${user.role}`}>
                    {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    {user.role === 'admin' ? 'Administrador' : 'Operacional'}
                </div>
            )
        },
        {
            header: 'CPF',
            accessor: (user: any) => <span className="text-muted">{maskCPF(user.cpf || '') || '—'}</span>
        },
        {
            header: 'Obra Vinculada',
            accessor: (user: any) => (
                user.sites?.name ? (
                    <div className="site-link">
                        <Building2 size={12} /> {user.sites.name}
                    </div>
                ) : <span className="text-muted">—</span>
            )
        },
        {
            header: 'Ações',
            accessor: (user: any) => (
                <div className="action-btns" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => navigate(`/admin/users/editar/${user.id}`)}><Edit2 size={14} /></button>
                    <button className="icon-btn delete" onClick={(e) => handleDelete(user.id, e)}><Trash2 size={14} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="users-view animate-fade">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Usuários</h1>
                    <p className="page-subtitle">Controle de acessos, funções e vínculos operacionais.</p>
                </div>
                <div className="header-actions">
                    {isLimitReached && (
                        <span className="limit-warning">Limite de Operários atingido ({workersCount}/{maxWorkers})</span>
                    )}
                    <button 
                        className="btn-primary" 
                        onClick={() => navigate('/admin/users/novo')}
                        disabled={isLimitReached}
                        title={isLimitReached ? "Limite de operários do seu plano atingido" : ""}
                    >
                        <UserPlus size={20} /> Registrar Membro
                    </button>
                </div>
            </header>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-bar animate-slide-down">
                    <div className="selection-info">
                        <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'membro selecionado' : 'membros selecionados'}
                    </div>
                    <div className="bulk-btns">
                        <button className="btn-danger-block" onClick={handleBulkDelete}>
                            <Trash2 size={16} /> Excluir Selecionados
                        </button>
                        <button className="btn-cancel" onClick={() => setSelectedIds([])}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <StandardCard 
                title="Membros da Organização" 
                subtitle={`Total de ${users.length} membros na organização.`}
            >
                <ModernTable 
                    columns={columns} 
                    data={users} 
                    loading={loading}
                    selectable={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </StandardCard>

            <style>{`
                .users-view { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 850; margin-bottom: 6px; letter-spacing: -0.5px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .user-cell { display: flex; align-items: center; gap: 12px; }
                .avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--bg-dark); border: 1px solid var(--border); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
                .user-email { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
                
                .role-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); }
                .role-badge.admin { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); border-color: rgba(var(--primary-rgb), 0.2); }
                .role-badge.worker { background: var(--bg-dark); color: var(--text-secondary); }
                .role-badge.worker .role-icon { color: var(--text-muted); }
                
                .site-link { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; }
                .site-link svg { color: var(--primary); }

                .bulk-actions-bar {
                    background: var(--bg-card);
                    border: 1px solid var(--primary);
                    border-radius: 12px;
                    padding: 12px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.1);
                }
                .selection-info { font-size: 14px; color: var(--text-primary); }
                .selection-info strong { color: var(--primary); font-size: 16px; }
                .bulk-btns { display: flex; gap: 12px; align-items: center; }
                .btn-danger-block { 
                    background: rgba(255, 68, 68, 0.1); 
                    border: 1px solid #ff4444; 
                    color: #ff4444; 
                    padding: 8px 16px; 
                    border-radius: 8px; 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    font-weight: 600; 
                    cursor: pointer;
                    font-size: 13px;
                }
                .btn-danger-block:hover { background: #ff4444; color: white; }
                .btn-cancel { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; }
                .btn-cancel:hover { color: var(--text-primary); }
                
                .animate-slide-down { animation: slideDown 0.3s ease-out; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

                .action-btns { display: flex; gap: 8px; justify-content: flex-end; }
                .icon-btn { background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .icon-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
                .icon-btn.delete:hover { background: rgba(255,59,48,0.1); color: var(--status-denied); border-color: rgba(255,59,48,0.2); }

                .limit-warning {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--status-denied);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: rgba(var(--status-denied-rgb), 0.1);
                    padding: 4px 12px;
                    border-radius: 6px;
                    margin-right: 12px;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }
            `}</style>
        </div>
    );
};

export default AdminUsers;
