import React from 'react';

export type StatusType = 'pending' | 'active' | 'cancelled' | 'delayed' | 'default';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const s = status.toLowerCase();
    
    const config: Record<string, { color: string; label: string }> = {
        active: { color: 'var(--status-approved)', label: 'Ativo' },
        approved: { color: 'var(--status-approved)', label: 'Aprovado' },
        new: { color: 'var(--status-pending)', label: 'Novo' },
        pending: { color: 'var(--status-pending)', label: 'Pendente' },
        completed: { color: 'var(--status-approved)', label: 'Concluído' },
        partial: { color: 'var(--status-pending)', label: 'Rec. Parcial' },
        delayed: { color: 'var(--status-denied)', label: 'Atrasado' },
        cancelled: { color: 'var(--status-denied)', label: 'Cancelado' },
        denied: { color: 'var(--status-denied)', label: 'Negado' },
    };

    const current = config[s] || { color: 'var(--text-muted)', label: label || status };

    return (
        <div className="status-badge-container">
            <span className="status-dot" style={{ backgroundColor: current.color }} />
            <span className="status-text">{current.label}</span>
            <style>{`
                .status-badge-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 2px 10px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    width: fit-content;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .status-text {
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};

export default StatusBadge;
