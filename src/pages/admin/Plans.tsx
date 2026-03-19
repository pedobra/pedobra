import { CheckCircle2, Star } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

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

            {isTrial && (
                <div className="trial-alert">
                    <span>Você está usando o <strong>Plano de Teste</strong></span>
                    <span className="trial-badge-orange">{daysRemaining} dias restantes</span>
                </div>
            )}

            <div className="plans-grid">
                {/* Plano Básico */}
                <div className="plan-card glass-premium">
                    <div className="plan-header-new">
                        <span className="plan-name-new">Plano Básico</span>
                        <span className="plan-price-new">Valor de R$ 97,00</span>
                    </div>
                    <div className="plan-body-new">
                        <span className="plan-access-title">Terá acesso:</span>
                        <ul className="features-list">
                            <li><CheckCircle2 size={16} color="var(--primary)" /> 2 obras</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> 2 dois usuários (Operários)</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Suporte Via WhatsApp</li>
                        </ul>
                    </div>
                    <button className="btn-primary w-full" style={{ padding: '14px', fontSize: '15px', fontWeight: 700 }}>
                        ASSINAR AGORA
                    </button>
                </div>

                {/* Plano Profissional */}
                <div className="plan-card glass-premium glass-premium-highlight">
                    <div className="recommended-badge">RECOMENDADO</div>
                    <div className="plan-header-new">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <span className="plan-name-new">Plano Profissional</span>
                            <span className="best-value-seal">
                                <Star size={12} fill="currentColor" /> Melhor Custo Benefício
                            </span>
                        </div>
                        <span className="plan-price-new">Valor de R$ 147,00</span>
                    </div>
                    <div className="plan-body-new">
                        <span className="plan-access-title">Terá acesso:</span>
                        <ul className="features-list">
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Obras Ilimitadas</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Usuários Ilimitados (Operários)</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Pedidos Ilimitados</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Materiais Ilimitados</li>
                            <li><CheckCircle2 size={16} color="var(--primary)" /> Suporte Via WhatsApp</li>
                        </ul>
                    </div>
                    <button className="btn-primary w-full" style={{ padding: '14px', fontSize: '15px', fontWeight: 700 }}>
                        ASSINAR AGORA
                    </button>
                </div>
            </div>

            <style>{`
                .plans-view { display: flex; flex-direction: column; gap: 32px; max-width: 900px; margin: 0 auto; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .trial-alert {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    padding: 16px 24px;
                    border-radius: 12px;
                    font-size: 15px;
                    color: var(--text-primary);
                }
                .trial-badge-orange {
                    background: #FF9500;
                    color: #FFF;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding-top: 12px; }
                
                .plan-card { 
                    display: flex; 
                    flex-direction: column; 
                    padding: 32px; 
                    border-radius: 16px;
                }
                
                .glass-premium {
                    background: var(--bg-glass);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid color-mix(in srgb, var(--text-primary) 20%, transparent);
                    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
                }
                
                .glass-premium:hover {
                    border-color: color-mix(in srgb, var(--text-primary) 40%, transparent);
                    box-shadow: 0 12px 40px -12px color-mix(in srgb, var(--text-primary) 30%, transparent);
                    transform: translateY(-4px);
                }

                .glass-premium-highlight {
                    border: 2px solid var(--text-primary);
                    position: relative;
                }
                
                .glass-premium-highlight:hover {
                    border-color: var(--text-primary);
                }

                .recommended-badge {
                    position: absolute;
                    top: -14px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--text-primary);
                    color: var(--bg-card);
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    box-shadow: 0 4px 12px color-mix(in srgb, var(--text-primary) 30%, transparent);
                    white-space: nowrap;
                }

                .best-value-seal {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(52, 199, 89, 0.1);
                    color: var(--status-approved);
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .plan-header-new {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 24px;
                    text-align: center;
                }
                .plan-name-new {
                    display: block;
                    font-size: 20px;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .plan-price-new {
                    display: block;
                    font-size: 32px;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                
                .plan-body-new {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 24px 0;
                    flex: 1;
                }
                .plan-access-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }

                .features-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; font-size: 15px; color: var(--text-primary); font-weight: 500;}
                .features-list li { display: flex; align-items: center; gap: 12px; }
                
                .w-full { width: 100%; justify-content: center; }
                
                @media (max-width: 800px) {
                    .plans-grid { grid-template-columns: 1fr; gap: 48px; }
                    .trial-alert { flex-direction: column; gap: 12px; text-align: center; }
                }
            `}</style>
        </div>
    );
};

export default AdminPlans;
