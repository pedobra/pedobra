import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { AlertTriangle, Crown } from 'lucide-react';

export const TrialBanner = () => {
    const { isTrial, daysRemaining, isExpired, loading } = useSubscription();

    if (loading || !isTrial || isExpired) return null;

    // Show warning if 2 days or less
    const isUrgent = daysRemaining <= 2;

    return (
        <div className={`trial-banner ${isUrgent ? 'urgent' : ''}`} style={{
            background: isUrgent ? '#ef4444' : 'var(--primary)',
            color: 'white',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 1000,
            position: 'relative'
        }}>
            {isUrgent ? <AlertTriangle size={18} /> : <Crown size={18} />}
            <span>
                {isUrgent 
                    ? `Atenção: Seu teste grátis expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.` 
                    : `Você está no período de teste gratuito. Restam ${daysRemaining} dias.`}
            </span>
            <button 
                onClick={() => window.location.href = '/admin/billing'}
                style={{
                    background: 'white',
                    color: isUrgent ? '#ef4444' : 'var(--primary)',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                }}
            >
                Assinar Plano Premium
            </button>
        </div>
    );
};
