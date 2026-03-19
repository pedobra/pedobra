import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity } from 'lucide-react';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_data: any;
    new_data: any;
    created_at: string;
    profiles?: {
        name: string;
    };
}

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profiles:user_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error: any) {
            console.error('Erro ao buscar logs:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { 
            header: 'Data', 
            accessor: (log: AuditLog) => new Date(log.created_at).toLocaleString('pt-BR') 
        },
        { 
            header: 'Usuário', 
            accessor: (log: AuditLog) => log.profiles?.name || 'Sistema' 
        },
        { 
            header: 'Ação', 
            accessor: (log: AuditLog) => (
                <span className={`action-badge ${log.action?.toLowerCase() || 'other'}`}>
                    {log.action || 'Ação'}
                </span>
            ) 
        },
        { 
            header: 'Entidade', 
            accessor: (log: AuditLog) => (
                <div className="entity-info">
                    <strong>{log.entity_type || 'N/A'}</strong>
                    <span className="text-mono-xs">{log.entity_id?.slice(0, 8)}</span>
                </div>
            ) 
        }
    ];

    return (
        <div className="audit-logs-view animate-fade">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Logs do Sistema</h1>
                    <p className="page-subtitle">Rastreabilidade completa de todas as ações realizadas na plataforma.</p>
                </div>
            </header>

            <StandardCard
                title="Histórico de Atividades"
                subtitle="Exibindo as últimas 100 ações registradas."
                icon={<Activity size={20} color="var(--primary)" />}
            >
                <ModernTable 
                    columns={columns} 
                    data={logs} 
                    loading={loading}
                    emptyMessage="Nenhum log de auditoria encontrado."
                />
            </StandardCard>

            <style>{`
                .audit-logs-view { display: flex; flex-direction: column; gap: 24px; }
                .view-header { margin-bottom: 32px; }
                .page-title { font-size: 28px; font-weight: 850; margin-bottom: 6px; letter-spacing: -0.5px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }

                .action-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .action-badge.create { background: rgba(34, 197, 94, 0.1); color: var(--status-approved); }
                .action-badge.update { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
                .action-badge.delete { background: rgba(239, 68, 68, 0.1); color: var(--status-denied); }

                .entity-info { display: flex; flex-direction: column; gap: 2px; }
                .text-mono-xs { font-size: 10px; font-family: var(--font-main); color: var(--text-muted); }
            `}</style>
        </div>
    );
};

export default AdminAuditLogs;
