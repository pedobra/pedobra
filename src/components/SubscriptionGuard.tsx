import { useSubscription } from '../hooks/useSubscription';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const SubscriptionGuard = ({ children, role }: { children: React.ReactNode, role: 'admin' | 'worker' }) => {
    const { isExpired, loading } = useSubscription();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    const isOnPlansPage = location.pathname === '/admin/plans';

    if (isExpired && !isOnPlansPage) {
        const handleLogout = async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
        };

        return (
            <div className="expired-overlay" style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--bg-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                <div className="expired-card premium-card" style={{
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    padding: '40px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                }}>
                    <div className="expired-icon" style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '20px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginBottom: '8px'
                    }}>
                        <ShieldAlert size={48} color="#ef4444" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {role === 'admin' ? 'Assinatura Expirada' : 'Acesso Bloqueado'}
                    </h2>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {role === 'admin' 
                            ? 'O período de uso do sistema expirou. Para continuar gerenciando suas obras e dados, por favor selecione um plano.' 
                            : 'O período de acesso desta organização expirou. Entre em contato com seu gestor para regularizar a assinatura do sistema.'}
                    </p>
                    
                    <div className="expired-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
                        {role === 'admin' ? (
                            <button className="btn-primary" onClick={() => navigate('/admin/plans')} style={{ width: '100%' }}>
                                Ver Planos de Assinatura
                            </button>
                        ) : (
                            <div style={{ 
                                padding: '16px', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '12px', 
                                fontSize: '13px', 
                                color: 'var(--text-muted)',
                                lineHeight: '1.4'
                            }}>
                                ⚠️ Suas atividades estão suspensas até que a conta seja renovada pelo administrador.
                            </div>
                        )}
                        <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <LogOut size={16} /> Sair do Sistema
                        </button>
                    </div>
                </div>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return <>{children}</>;
};
