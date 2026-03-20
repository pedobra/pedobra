import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { AlertTriangle, Crown, ArrowRight } from 'lucide-react';

export const TrialBanner = () => {
    const navigate = useNavigate();
    const { planId, daysRemaining = 0, isExpired, loading } = useSubscription();
    const isTrial = planId === 'trial';
    
    if (loading || !isTrial || isExpired) return null;

    // Show warning if 2 days or less
    const isUrgent = (daysRemaining ?? 0) <= 2;

    return (
        <div className={`trial-banner-premium ${isUrgent ? 'urgent' : ''}`}>
            <div className="banner-content">
                <div className="banner-message">
                    {isUrgent ? <AlertTriangle size={16} className="text-orange" /> : <Crown size={16} className="text-primary" />}
                    <span>
                        {isUrgent 
                            ? `Atenção: Seu teste grátis expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.` 
                            : `Você está no período de teste gratuito. Restam ${daysRemaining} dias.`}
                    </span>
                </div>
                <button 
                    onClick={() => navigate('/admin/plans')}
                    className="banner-cta"
                >
                    ASSINAR PLANO PROFISSIONAL <ArrowRight size={14} />
                </button>
            </div>

            <style>{`
                .trial-banner-premium {
                    background: var(--bg-glass);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 2px solid ${isUrgent ? '#FF9500' : 'var(--border)'};
                    padding: 8px 24px;
                    z-index: 1000;
                    position: relative;
                }
                .banner-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 24px;
                }
                .banner-message {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .text-orange { color: #FF9500; }
                .text-primary { color: var(--primary); }
                
                .banner-cta {
                    background: var(--primary);
                    color: var(--primary-foreground);
                    border: none;
                    padding: 6px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }
                .banner-cta:hover {
                    opacity: 0.9;
                    transform: translateX(2px);
                }

                @media (max-width: 768px) {
                    .banner-content { flex-direction: column; gap: 8px; text-align: center; }
                    .banner-cta { width: 100%; justify-content: center; }
                }
            `}</style>
        </div>
    );
};
