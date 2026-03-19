import { Crown, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import StandardCard from '../../components/ui/StandardCard';

const AdminPlans = () => {
    const { isTrial, daysRemaining } = useSubscription();
    
    return (
        <div className="plans-view animate-fade">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Planos e Assinaturas</h1>
                    <p className="page-subtitle">Gerencie o licenciamento e os limites da sua organização.</p>
                </div>
            </header>

            <div className="plans-grid">
                <StandardCard title="Plano Atual" subtitle="Status do seu licenciamento.">
                    <div className="plan-card">
                        <div className="plan-header">
                            <Crown size={32} className="plan-icon" />
                            <div>
                                <span className="plan-name">Plano Enterprise</span>
                                <span className={`plan-status ${isTrial ? 'trial' : 'active'}`}>
                                    {isTrial ? 'Período de Teste' : 'Assinatura Ativa'}
                                </span>
                            </div>
                        </div>
                        <div className="plan-details">
                            <div className="detail-row">
                                <Calendar size={18} />
                                <span>Vencimento:</span>
                                <strong>{isTrial ? `${daysRemaining} dias restantes` : 'Renovação Mensal'}</strong>
                            </div>
                            <div className="detail-row">
                                <CreditCard size={18} />
                                <span>Método de Pagamento:</span>
                                <strong>Cartão de Crédito</strong>
                            </div>
                        </div>
                        <button className="btn-primary w-full" style={{ padding: '14px', fontSize: '15px' }}>
                            Gerenciar Faturamento
                        </button>
                    </div>
                </StandardCard>

                <StandardCard title="Recursos do Plano" subtitle="O que está incluso na sua assinatura.">
                    <ul className="features-list">
                        <li><CheckCircle2 size={16} color="var(--status-approved)" /> Canteiros ilimitados</li>
                        <li><CheckCircle2 size={16} color="var(--status-approved)" /> Usuários ilimitados</li>
                        <li><CheckCircle2 size={16} color="var(--status-approved)" /> Pedidos avançados e orçamentação</li>
                        <li><CheckCircle2 size={16} color="var(--status-approved)" /> Suporte prioritário 24/7</li>
                    </ul>
                </StandardCard>
            </div>

            <style>{`
                .plans-view { display: flex; flex-direction: column; gap: 32px; max-width: 900px; margin: 0 auto; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
                
                .plan-card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
                .plan-header { display: flex; align-items: center; gap: 20px; }
                .plan-icon { color: var(--primary); filter: drop-shadow(0 0 8px var(--primary-glow)); }
                .plan-name { display: block; font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }
                .plan-status { font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; }
                .plan-status.active { background: rgba(52,199,89,0.1); color: var(--status-approved); }
                .plan-status.trial { background: rgba(255,149,0,0.1); color: var(--status-pending); }
                
                .plan-details { display: flex; flex-direction: column; gap: 16px; padding: 24px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
                .detail-row { display: flex; align-items: center; gap: 12px; font-size: 15px; color: var(--text-secondary); }
                .detail-row strong { margin-left: auto; color: var(--text-primary); font-weight: 700; }
                
                .w-full { width: 100%; justify-content: center; }
                
                .features-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; font-size: 15px; color: var(--text-primary); font-weight: 500;}
                .features-list li { display: flex; align-items: center; gap: 12px; }
                
                @media (max-width: 800px) {
                    .plans-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default AdminPlans;
