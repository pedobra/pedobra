import React from 'react';

export type StatusType = 'pending' | 'active' | 'cancelled' | 'delayed' | 'default';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const s = status.toLowerCase();
    
    const config: Record<string, { color: string; label: string }> = {
        active: { color: '#22C55E', label: 'Ativo' },
        approved: { color: '#22C55E', label: 'Aprovado' },
        pending: { color: '#F59E0B', label: 'Pendente' },
        delayed: { color: '#7C3AED', label: 'Atrasado' },
        cancelled: { color: '#EF4444', label: 'Cancelado' },
        denied: { color: '#EF4444', label: 'Recusado' },
    };

    const current = config[s] || { color: '#868E96', label: label || status };

    return (
        <div className="status-badge-container">
            <span className="status-dot" style={{ backgroundColor: current.color }} />
            <span className="status-text">{current.label}</span>
            <style>{`
                .status-badge-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 12px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 100px;
                    width: fit-content;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .status-text {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};

export default StatusBadge;
