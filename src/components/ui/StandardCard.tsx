import React from 'react';

interface StandardCardProps {
    title?: string;
    children: React.ReactNode;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
}

const StandardCard: React.FC<StandardCardProps> = ({ title, children, subtitle, icon, actions }) => {
    return (
        <div className="standard-card animate-fade">
            {(title || actions) && (
                <div className="standard-card-header">
                    <div className="standard-card-titles">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {icon && <div className="standard-card-icon">{icon}</div>}
                            {title && <h3>{title}</h3>}
                        </div>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    {actions && <div className="standard-card-actions">{actions}</div>}
                </div>
            )}
            <div className="standard-card-content">
                {children}
            </div>
            <style>{`
                .standard-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    overflow: hidden;
                    margin-bottom: 24px;
                    transition: border-color var(--transition-speed);
                }
                .standard-card-header {
                    padding: 24px 32px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .standard-card-titles h3 {
                    font-size: 18px;
                    margin: 0;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .standard-card-titles p {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 4px 0 0 0;
                }
                .standard-card-content {
                    padding: 32px;
                }
            `}</style>
        </div>
    );
};

export default StandardCard;
