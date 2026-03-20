import React from 'react';

export type StatusType = 'pending' | 'active' | 'cancelled' | 'delayed' | 'default';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const s = status.toLowerCase();
    
    const config: Record<string, { color: string; bg: string; label: string }> = {
        active: { color: 'var(--status-approved)', bg: 'rgba(16, 185, 129, 0.1)', label: 'Ativo' },
        approved: { color: 'var(--status-approved)', bg: 'rgba(16, 185, 129, 0.1)', label: 'Aprovado' },
        new: { color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Novo' },
        pending: { color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pendente' },
        completed: { color: 'var(--status-approved)', bg: 'rgba(16, 185, 129, 0.1)', label: 'Concluído' },
        partial: { color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Rec. Parcial' },
        delayed: { color: 'var(--status-denied)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Atrasado' },
        cancelled: { color: 'var(--status-denied)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelado' },
        denied: { color: 'var(--status-denied)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Negado' },
    };

    const current = config[s] || { color: 'var(--text-muted)', bg: 'var(--bg-dark)', label: label || status };

    return (
        <div className="status-badge-container">
            <span className="status-dot" style={{ backgroundColor: current.color }} />
            <span className="status-text">{current.label}</span>
            <style>{`
                .status-badge-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    background: ${current.bg};
                    border: 1px solid ${current.color.includes('var') ? 'rgba(0,0,0,0.1)' : current.color};
                    border-radius: 20px;
                    width: fit-content;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .status-text {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};

export default StatusBadge;
