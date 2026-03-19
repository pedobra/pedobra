import React from 'react';

export type StatusType = 'pending' | 'active' | 'cancelled' | 'delayed' | 'default';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const s = status.toLowerCase();
    
    const config: Record<string, { color: string; label: string }> = {
        active: { color: '#10B981', label: 'Active' },
        approved: { color: '#10B981', label: 'Active' },
        pending: { color: '#F59E0B', label: 'Pending' },
        delayed: { color: '#EF4444', label: 'Delayed' },
        cancelled: { color: '#EF4444', label: 'Cancelled' },
        denied: { color: '#EF4444', label: 'Cancelled' },
    };

    const current = config[s] || { color: '#9CA3AF', label: label || status };

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
                    background: #F9FAFB;
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
