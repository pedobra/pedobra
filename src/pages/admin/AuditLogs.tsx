import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Calendar, User, Database } from 'lucide-react';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [filterUser, setFilterUser] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchLogs();
    }, [filterAction, filterEntity, filterDate, filterUser]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name').order('name');
        if (data) setUsers(data);
    };

    const fetchLogs = async () => {
        setLoading(true);
        let query = supabase
            .from('audit_logs')
            .select('*, profiles(name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (filterAction) query = query.eq('action', filterAction);
        if (filterEntity) query = query.eq('entity', filterEntity);
        if (filterUser) query = query.eq('user_id', filterUser);
        if (filterDate) {
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            query = query.gte('created_at', startOfDay.toISOString());
            query = query.lte('created_at', endOfDay.toISOString());
        }

        const { data } = await query;
        if (data) setLogs(data);
        setLoading(false);
    };

    const formatEntityName = (entity: string) => {
        const map: Record<string, string> = {
            'orders': 'Pedido',
            'materials': 'Material',
            'sites': 'Canteiro',
            'profiles': 'Usuário',
            'company_settings': 'Configurações'
        };
        return map[entity] || entity;
    };

    const formatActionName = (action: string) => {
        const map: Record<string, string> = {
            'CRIAR': 'Criou',
            'ATUALIZAR': 'Atualizou',
            'DELETAR': 'Deletou'
        };
        return map[action] || action;
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CRIAR': return 'var(--status-approved)';
            case 'ATUALIZAR': return '#0A84FF';
            case 'DELETAR': return 'var(--status-denied)';
            default: return 'var(--text-muted)';
        }
    };

    const filteredLogs = logs;

    return (
        <div className="audit-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Controle de Logs</h1>
                    <p className="page-subtitle">Rastreamento de todas as atividades, modificações e acessos no sistema.</p>
                </div>
            </header>

            <div className="filters-container premium-card">
                <div className="filters-grid">
                    <div className="filter-item">
                        <Activity size={14} />
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                            <option value="">Todas as Ações</option>
                            <option value="CRIAR">Criações</option>
                            <option value="ATUALIZAR">Atualizações</option>
                            <option value="DELETAR">Exclusões</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <Database size={14} />
                        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
                            <option value="">Toda a Plataforma</option>
                            <option value="orders">Pedidos</option>
                            <option value="materials">Materiais</option>
                            <option value="sites">Canteiros de Obra</option>
                            <option value="profiles">Usuários</option>
                            <option value="company_settings">Configurações</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <User size={14} />
                        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                            <option value="">Todos os Usuários</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <Calendar size={14} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="date-picker-dark"
                        />
                    </div>
                </div>
            </div>

            <div className="premium-table-wrapper">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--primary)' }}>Carregando logs...</div>
                ) : (
                    <table className="modern-table logs-table">
                        <thead>
                            <tr>
                                <th>DATA E HORA</th>
                                <th>USUÁRIO</th>
                                <th>AÇÃO</th>
                                <th>MÓDULO</th>
                                <th>DETALHES DA OCORRÊNCIA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="date-cell">
                                        <strong>{new Date(log.created_at).toLocaleDateString()}</strong>
                                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="avatar-sm">
                                                {(log.profiles?.name || 'Sis').substring(0, 2).toUpperCase()}
                                            </div>
                                            <span>{log.profiles?.name || 'Sistema / Backend'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="action-badge" style={{ color: getActionColor(log.action), borderColor: getActionColor(log.action) }}>
                                            {formatActionName(log.action)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="module-tag">{formatEntityName(log.entity)}</span>
                                    </td>
                                    <td className="details-cell">
                                        <div className="details-scroller">
                                            <code>{JSON.stringify(log.details)}</code>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        Nenhum registro encontrado para estes filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
        .audit-view { display: flex; flex-direction: column; gap: 32px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; }

        .filters-container { display: flex; flex-direction: column; gap: 20px; padding: 20px; }
        .filters-grid { display: flex; gap: 16px; flex-wrap: wrap; }
        .filter-item { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 10px 16px; border-radius: 12px; }
        .filter-item select, .filter-item input { background: transparent; border: none; color: white; outline: none; font-size: 13px; }
        .filter-item select option { background: var(--bg-card); color: white; }
        .date-picker-dark::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }

        .logs-table th { font-size: 11px; letter-spacing: 1px; color: var(--text-muted); }
        .logs-table td { padding: 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }
        
        .date-cell { display: flex; flex-direction: column; gap: 4px; }
        .date-cell strong { color: var(--text-primary); font-size: 14px; }
        .date-cell span { color: var(--text-muted); font-size: 12px; }

        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 215, 0, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
        
        .action-badge { font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; border: 1px solid; text-transform: uppercase; letter-spacing: 1px; }
        .module-tag { background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #ddd; }
        
        .details-cell { max-width: 300px; }
        .details-scroller { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; overflow-x: auto; white-space: nowrap; }
        .details-scroller code { font-family: monospace; font-size: 11px; color: #a5b4fc; }
        .details-scroller::-webkit-scrollbar { height: 4px; }
        .details-scroller::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>
        </div>
    );
};

export default AdminAuditLogs;
