import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    TrendingUp, 
    CreditCard, 
    Percent, 
    DollarSign, 
    ArrowUpRight, 
    PieChart as PieChartIcon
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const MasterFinanceiro = () => {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [config, setConfig] = useState({
        plan_basic_price: 147,
        plan_pro_price: 297,
        gateway_fee_percent: 4.99
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgsRes, configRes] = await Promise.all([
                supabase.from('organizations').select('*'),
                supabase.from('master_config').select('*').single()
            ]);

            if (orgsRes.data) setOrganizations(orgsRes.data);
            if (configRes.data) {
                setConfig({
                    plan_basic_price: Number(configRes.data.plan_basic_price),
                    plan_pro_price: Number(configRes.data.plan_pro_price),
                    gateway_fee_percent: Number(configRes.data.gateway_fee_percent)
                });
            }
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('master_config')
                .update({
                    plan_basic_price: config.plan_basic_price,
                    plan_pro_price: config.plan_pro_price,
                    gateway_fee_percent: config.gateway_fee_percent,
                    updated_at: new Date().toISOString()
                })
                .match({ id: (await supabase.from('master_config').select('id').single()).data?.id });

            if (error) throw error;
            alert('Configurações salvas com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const financialData = useMemo(() => {
        const stats = organizations.reduce((acc, org) => {
            const plan = (org.plan_id || 'free').toLowerCase();
            const status = (org.subscription_status || 'inactive').toLowerCase();
            
            if (status === 'active') {
                if (plan === 'pro' || plan === 'professional') {
                    acc.proCount++;
                    acc.gross += config.plan_pro_price;
                } else if (plan === 'basic') {
                    acc.basicCount++;
                    acc.gross += config.plan_basic_price;
                } else {
                    acc.freeCount++;
                }
            }
            return acc;
        }, { gross: 0, proCount: 0, basicCount: 0, freeCount: 0 });

        const gatewayFee = (stats.gross * config.gateway_fee_percent) / 100;
        const net = stats.gross - gatewayFee;

        const chartData = [
            { name: 'Profissional', value: stats.proCount * config.plan_pro_price, count: stats.proCount, key: 'pro' },
            { name: 'Básico', value: stats.basicCount * config.plan_basic_price, count: stats.basicCount, key: 'basic' },
            { name: 'Gratuito', value: 0, count: stats.freeCount, key: 'free' }
        ].filter(d => d.count > 0 || d.name === 'Gratuito');

        return { ...stats, gatewayFee, net, chartData };
    }, [organizations, config]);

    const filteredOrganizations = useMemo(() => {
        if (!selectedPlan) return organizations;
        return organizations.filter(org => {
            const p = (org.plan_id || 'free').toLowerCase();
            if (selectedPlan === 'pro') return p === 'pro' || p === 'professional';
            return p === selectedPlan;
        });
    }, [organizations, selectedPlan]);

    const columns: any[] = [
        { header: 'Cliente', accessor: (org: any) => <strong>{org.name}</strong>, align: 'center' },
        { 
            header: 'Plano', 
            align: 'center',
            accessor: (org: any) => (
                <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: org.plan_id === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(108, 117, 125, 0.1)',
                    color: org.plan_id === 'pro' ? 'var(--status-active)' : 'var(--text-muted)'
                }}>
                    {org.plan_id || 'TRIAL'}
                </span>
            )
        },
        { 
            header: 'Receita Bruta', 
            align: 'center',
            accessor: (org: any) => {
                const plan = (org.plan_id || 'free').toLowerCase();
                const price = (plan === 'pro' || plan === 'professional') ? config.plan_pro_price : (plan === 'basic' ? config.plan_basic_price : 0);
                return `R$ ${price.toFixed(2)}`;
            }
        },
        { 
            header: 'Status', 
            accessor: (org: any) => {
                const status = org.subscription_status?.toLowerCase();
                const isActive = status === 'active';
                const isTrial = status === 'trialing';
                
                return (
                    <span style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        color: isActive ? 'var(--status-active)' : (isTrial ? '#3b82f6' : 'var(--status-cancelled)')
                    }}>
                        <div style={{ 
                            width: 8, height: 8, borderRadius: '50%', 
                            background: isActive ? 'var(--status-active)' : (isTrial ? '#3b82f6' : 'var(--status-cancelled)')
                        }} />
                        {isActive ? 'Ativo' : (isTrial ? 'Em Teste' : 'Suspenso')}
                    </span>
                );
            },
            align: 'center'
        },
    ];

    return (
        <div className="financeiro-master animate-fade">
            <header className="dashboard-header" style={{ marginBottom: '32px' }}>
                <div className="header-info">
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <PieChartIcon size={32} color="var(--primary)" />
                        Gestão Financeira Global
                    </h1>
                    <p className="page-subtitle">Configure valores de planos e acompanhe a receita da plataforma.</p>
                </div>
            </header>

            <div className="finance-grid">
                {/* CONFIGURATION CARD */}
                <StandardCard title="Configuração de Valores" subtitle="Ajuste os preços dos planos e taxas de processamento.">
                    <div className="config-inputs">
                        <div className="input-group-saas">
                            <label><CreditCard size={14} /> Plano Básico (R$)</label>
                            <input 
                                type="number" 
                                value={config.plan_basic_price} 
                                onChange={e => setConfig({...config, plan_basic_price: Number(e.target.value)})}
                            />
                        </div>
                        <div className="input-group-saas">
                            <label><TrendingUp size={14} /> Plano Profissional (R$)</label>
                            <input 
                                type="number" 
                                value={config.plan_pro_price} 
                                onChange={e => setConfig({...config, plan_pro_price: Number(e.target.value)})}
                            />
                        </div>
                        <div className="input-group-saas">
                            <label><Percent size={14} /> Taxa Gateway (%)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={config.gateway_fee_percent} 
                                onChange={e => setConfig({...config, gateway_fee_percent: Number(e.target.value)})}
                            />
                        </div>
                        <button className="btn-primary" onClick={handleSaveConfig} disabled={saving} style={{ marginTop: 'auton' }}>
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </StandardCard>

                {/* SUMMARY CARDS */}
                <div className="summary-cards">
                    <div className="summary-card gold">
                        <div className="summary-icon"><DollarSign size={24} /></div>
                        <div className="summary-info">
                            <label>Faturamento Bruto</label>
                            <strong>R$ {financialData.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <ArrowUpRight className="trend-icon" />
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon"><Percent size={24} /></div>
                        <div className="summary-info">
                            <label>Taxas Gateway</label>
                            <strong style={{ color: 'var(--status-cancelled)' }}>- R$ {financialData.gatewayFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <div className="summary-card success">
                        <div className="summary-icon"><TrendingUp size={24} /></div>
                        <div className="summary-info">
                            <label>Lucro Líquido</label>
                            <strong style={{ color: 'var(--status-active)' }}>R$ {financialData.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="charts-layout" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', margin: '24px 0' }}>
                <StandardCard title="Distribuição de Receita" subtitle="Clique em uma fatia para filtrar os clientes abaixo.">
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={financialData.chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={(data: any) => data && data.key && setSelectedPlan(selectedPlan === data.key ? null : data.key)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {financialData.chartData.map((entry: any, index: number) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={COLORS[index % COLORS.length]} 
                                            stroke={selectedPlan === entry.key ? 'var(--text-primary)' : 'none'}
                                            strokeWidth={selectedPlan === entry.key ? 2 : 0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => `R$ ${Number(value || 0).toLocaleString('pt-BR')}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </StandardCard>

                <StandardCard title="Base de Clientes" subtitle="Total de organizações por nível de plano.">
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={financialData.chartData} onClick={(data: any) => data && data.activePayload && setSelectedPlan(selectedPlan === data.activePayload[0].payload.key ? null : data.activePayload[0].payload.key)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" />
                                <YAxis fontSize={12} stroke="var(--text-muted)" />
                                <Tooltip />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}>
                                    {financialData.chartData.map((entry: any, index: number) => (
                                        <Cell 
                                            key={`bar-cell-${index}`} 
                                            fill={COLORS[index % COLORS.length]} 
                                            opacity={selectedPlan && selectedPlan !== entry.key ? 0.3 : 1}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </StandardCard>
            </div>

            {/* DRILL DOWN TABLE */}
            <StandardCard 
                title={selectedPlan ? `Clientes: Plano ${selectedPlan.toUpperCase()}` : "Todos os Clientes (Financeiro)"}
                subtitle="Listagem detalhada dos recebimentos por organização."
            >
                {selectedPlan && (
                    <div style={{ marginBottom: '16px' }}>
                        <button className="btn-ghost" onClick={() => setSelectedPlan(null)}>Limpar Filtro</button>
                    </div>
                )}
                <ModernTable 
                    columns={columns} 
                    data={filteredOrganizations} 
                    loading={loading}
                />
            </StandardCard>

            <style>{`
                .finance-grid { display: grid; grid-template-columns: 350px 1fr; gap: 24px; }
                .config-inputs { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
                
                .input-group-saas { display: flex; flex-direction: column; gap: 6px; }
                .input-group-saas label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
                .input-group-saas input { 
                    height: 44px; background: var(--bg-dark); border: 1.5px solid var(--border); 
                    border-radius: 8px; padding: 0 12px; color: var(--text-primary); outline: none;
                    transition: border-color 0.2s;
                }
                .input-group-saas input:focus { border-color: var(--primary); }

                .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                .summary-card { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 12px; 
                    padding: 24px; display: flex; align-items: center; gap: 20px; position: relative;
                }
                .summary-card.gold { border-color: var(--primary); }
                .summary-icon { 
                    width: 54px; height: 54px; border-radius: 12px; 
                    background: var(--bg-dark); display: flex; align-items: center; justify-content: center;
                    color: var(--primary); border: 1px solid var(--border);
                }
                .summary-info label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
                .summary-info strong { font-size: 24px; font-weight: 800; display: block; margin-top: 4px; }
                .trend-icon { position: absolute; top: 16px; right: 16px; color: var(--status-active); opacity: 0.6; }

                @media (max-width: 1200px) {
                    .finance-grid { grid-template-columns: 1fr; }
                    .charts-layout { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default MasterFinanceiro;
