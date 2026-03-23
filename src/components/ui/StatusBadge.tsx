import React from 'react';

export type StatusType = 'pending' | 'active' | 'cancelled' | 'delayed' | 'default';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const s = status.toLowerCase();
    
    const config: Record<string, { color: string; bg: string; label: string }> = {
        active: { color: 'var(--status-active)', bg: 'rgba(16, 185, 129, 0.05)', label: 'Ativo' },
        approved: { color: 'var(--status-approved)', bg: 'rgba(34, 197, 94, 0.05)', label: 'Aprovado' },
        new: { color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.05)', label: 'Novo' },
        pending: { color: 'var(--status-pending)', bg: 'rgba(245, 158, 11, 0.05)', label: 'Pendente' },
        completed: { color: 'var(--status-approved)', bg: 'rgba(34, 197, 94, 0.05)', label: 'Concluído' },
        partial: { color: 'var(--status-partial)', bg: 'rgba(245, 158, 11, 0.05)', label: 'Rec. Parcial' },
        delayed: { color: 'var(--status-cancelled)', bg: 'rgba(239, 68, 68, 0.05)', label: 'Atrasado' },
        cancelled: { color: 'var(--status-cancelled)', bg: 'rgba(239, 68, 68, 0.05)', label: 'Cancelado' },
        denied: { color: 'var(--status-denied)', bg: 'rgba(239, 68, 68, 0.08)', label: 'Não Autorizado' },
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
                    gap: 8px;
                    padding: 4px 14px;
                    background: ${current.bg};
                    border: 1.5px solid ${current.color};
                    border-radius: 12px;
                    width: fit-content;
                    transition: all 0.2s ease;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .status-text {
                    font-size: 13px;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1;
                    letter-spacing: -0.01em;
                }
            `}</style>
        </div>
    );
};

export default StatusBadge;
