import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Calendar, ArrowUpDown, CheckCircle2, XCircle, Package, Clock, User } from 'lucide-react';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

interface AuditLog {
    id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    user_id: string;
    details: any;
    created_at: string;
    user_email?: string;
    user_name?: string;
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
                    profiles:user_id (
                        email,
                        name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            
            const formattedLogs = data.map(log => ({
                ...log,
                user_email: log.profiles?.email,
                user_name: log.profiles?.name
            }));
            
            setLogs(formattedLogs);
        } catch (error: any) {
            console.error('Error fetching logs:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Data/Hora',
            accessor: (log: AuditLog) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{new Date(log.created_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                </div>
            )
        },
        {
            header: 'Usuário',
            accessor: (log: AuditLog) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--primary)'
                    }}>
                        {(log.user_name || log.user_email || '?')[0].toUpperCase()}
                    </div>
                    <span>{log.user_name || log.user_email || 'Sistema'}</span>
                </div>
            )
        },
        {
            header: 'Ação',
            accessor: (log: AuditLog) => (
                <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: log.action_type === 'DELETE' ? '#ef4444' : '#3b82f6',
                    border: `1px solid ${log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                    display: 'inline-block'
                }}>
                    {log.action_type}
                </div>
            )
        },
        {
            header: 'Entidade',
            accessor: (log: AuditLog) => (
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {log.entity_type}
                </span>
            )
        },
        {
            header: 'Detalhes',
            accessor: (log: AuditLog) => (
                <div style={{ maxWidth: '300px' }}>
                    <div style={{ 
                        background: 'rgba(0,0,0,0.05)', 
                        padding: '8px', 
                        borderRadius: '6px', 
                        fontSize: '11px',
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap'
                    }}>
                        {JSON.stringify(log.details)}
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Logs de Auditoria</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                    Rastreie todas as alterações importantes feitas no sistema.
                </p>
            </div>

            <StandardCard icon={<Activity size={20} color="var(--primary)" />} title="Histórico de Ações" subtitle="Últimas 100 atividades registradas.">
                <ModernTable 
                    columns={columns} 
                    data={logs} 
                    loading={loading}
                    emptyMessage="Nenhum log encontrado."
                />
            </StandardCard>
        </div>
    );
};

export default AdminAuditLogs;
