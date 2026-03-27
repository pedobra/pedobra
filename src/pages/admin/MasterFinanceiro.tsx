import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Search, 
    Mail,
    CreditCard,
    TrendingUp,
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
import OrganizationManageModal from '../../components/modals/OrganizationManageModal';
import OrganizationDetailModal from '../../components/modals/OrganizationDetailModal';

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
    const [activeTab, setActiveTab] = useState<'audit' | 'webhooks' | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [detailOrg, setDetailOrg] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    useEffect(() => {
        fetchData();
        fetchAuditLogs();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgsRes, profilesRes, configRes] = await Promise.all([
                supabase.from('organizations').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('email, organization_id, name').eq('role', 'admin'),
                supabase.from('master_config').select('*').single()
            ]);

            if (orgsRes.data) {
                const enrichedOrgs = orgsRes.data.map(org => {
                    const owner = profilesRes.data?.find(p => p.organization_id === org.id);
                    return {
                        ...org,
                        owner_email: owner?.email || 'N/A',
                        owner_name: owner?.name || 'N/A'
                    };
                });
                setOrganizations(enrichedOrgs);
            }
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

    const fetchAuditLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('action', 'payment_processed')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setAuditLogs(data);
        setLoading(false);
    };

    const fetchWebhookLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setWebhookLogs(data);
        setLoading(false);
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
                    acc.paidCount++;
                } else if (plan === 'basic') {
                    acc.basicCount++;
                    acc.gross += config.plan_basic_price;
                    acc.paidCount++;
                } else if (plan === 'custom') {
                    acc.gross += Number(org.custom_plan_price || 0);
                    acc.paidCount++;
                } else {
                    acc.freeCount++;
                }
            }
            return acc;
        }, { gross: 0, proCount: 0, basicCount: 0, freeCount: 0, paidCount: 0 });

        const gatewayFee = (stats.gross * config.gateway_fee_percent) / 100;
        const net = stats.gross - gatewayFee;

        // Group by Month (Last 6 months)
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlySeries = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth();
            const y = d.getFullYear();
            
            const signups = organizations.filter(org => {
                const od = new Date(org.created_at);
                return od.getMonth() === m && od.getFullYear() === y;
            }).length;

            const sales = auditLogs.filter(log => {
                const ld = new Date(log.created_at);
                return ld.getMonth() === m && ld.getFullYear() === y && log.action === 'payment_processed';
            }).length;

            return { month: monthNames[m], signups, sales, sortIdx: i };
        }).reverse();

        const customTotal = organizations.reduce((sum, org) => {
            if (org.plan_id === 'custom' && org.subscription_status?.toLowerCase() === 'active') {
                return sum + Number(org.custom_plan_price || 0);
            }
            return sum;
        }, 0);

        const chartData = [
            { name: 'Profissional', value: stats.proCount * config.plan_pro_price, count: stats.proCount, key: 'pro' },
            { name: 'Básico', value: stats.basicCount * config.plan_basic_price, count: stats.basicCount, key: 'basic' },
            { name: 'Personalizado', value: customTotal, count: organizations.filter(o => o.plan_id === 'custom').length, key: 'custom' },
            { name: 'Gratuito', value: 0, count: stats.freeCount, key: 'free' }
        ].filter(d => d.count > 0 || d.name === 'Gratuito');

        return { ...stats, gatewayFee, net, chartData, monthlySeries };
    }, [organizations, config, auditLogs]);

    const filteredOrganizations = useMemo(() => {
        return organizations.filter(org => {
            const matchesSearch = 
                org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                org.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                org.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                org.id?.toLowerCase().includes(searchTerm.toLowerCase());

            const orgDate = new Date(org.created_at);
            const matchesMonth = selectedMonth === 'all' || 
                `${orgDate.getFullYear()}-${String(orgDate.getMonth() + 1).padStart(2, '0')}` === selectedMonth;

            const matchesPlan = !selectedPlan || (org.plan_id || 'free').toLowerCase() === selectedPlan;

            return matchesSearch && matchesMonth && matchesPlan;
        });
    }, [organizations, searchTerm, selectedMonth, selectedPlan]);

    const months = useMemo(() => {
        const m = new Set<string>();
        organizations.forEach(org => {
            const d = new Date(org.created_at);
            m.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(m).sort().reverse();
    }, [organizations]);

    const columns: any[] = [
        { 
            header: 'Cliente', 
            accessor: (org: any) => (
                <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block' }}>{org.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={10} /> {org.owner_email}
                    </div>
                </div>
            ), 
            align: 'left' 
        },
        { 
            header: 'Assinado em', 
            accessor: (org: any) => <span style={{ fontSize: '12px' }}>{new Date(org.created_at).toLocaleDateString('pt-BR')}</span>,
            align: 'center' 
        },
        { 
            header: 'Plano', 
            align: 'center',
            accessor: (org: any) => (
                <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: org.plan_id === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(108, 117, 125, 0.1)',
                    color: org.plan_id === 'pro' ? 'var(--status-active)' : 'var(--text-muted)'
                }}>
                    {org.plan_id?.toUpperCase() || 'TRIAL'}
                </span>
            )
        },
        { 
            header: 'Receita Bruta', 
            align: 'center',
            accessor: (org: any) => {
                const plan = (org.plan_id || 'free').toLowerCase();
                const price = (plan === 'pro' || plan === 'professional') ? config.plan_pro_price : (plan === 'basic' ? config.plan_basic_price : (plan === 'custom' ? Number(org.custom_plan_price || 0) : 0));
                return `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
        {
            header: 'Ações',
            align: 'center',
            accessor: (org: any) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                        className="btn-secondary" 
                        style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrg(org);
                        }}
                    >
                        Gerenciar
                    </button>
                    <button 
                        className="btn-ghost" 
                        style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setDetailOrg(org);
                        }}
                    >
                        <Search size={14} />
                    </button>
                </div>
            )
        }
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
                        <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </StandardCard>

                {/* SUMMARY CARDS GRID (2x3) */}
                <div className="summary-grid-saas">
                    <div className="summary-card gold">
                        <div className="summary-icon"><DollarSign size={20} /></div>
                        <div className="summary-info">
                            <label>Faturamento Bruto</label>
                            <strong>R$ {financialData.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon"><Percent size={20} /></div>
                        <div className="summary-info">
                            <label>Taxas Gateway</label>
                            <strong style={{ color: '#ef4444' }}>- R$ {financialData.gatewayFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <div className="summary-card success">
                        <div className="summary-icon"><TrendingUp size={20} /></div>
                        <div className="summary-info">
                            <label>Lucro Líquido</label>
                            <strong style={{ color: '#10b981' }}>R$ {financialData.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    
                    <div className="summary-card">
                        <div className="summary-icon"><CreditCard size={20} /></div>
                        <div className="summary-info">
                            <label>Clientes Totais</label>
                            <strong>{organizations.length}</strong>
                        </div>
                    </div>
                    <div className="summary-card success">
                        <div className="summary-icon"><ArrowUpRight size={20} /></div>
                        <div className="summary-info">
                            <label>Pagantes Ativos</label>
                            <strong style={{ color: '#10b981' }}>{financialData.paidCount}</strong>
                        </div>
                    </div>
                    <div className="summary-card" style={{ padding: '12px' }}>
                        <div style={{ height: '60px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Pagantes', value: financialData.paidCount },
                                            { name: 'Restante', value: Math.max(0, organizations.length - financialData.paidCount) }
                                        ]}
                                        innerRadius={15}
                                        outerRadius={25}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#374151" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', fontSize: '10px', fontWeight: 800 }}>
                                {organizations.length > 0 ? Math.round((financialData.paidCount / organizations.length) * 100) : 0}%
                            </div>
                        </div>
                        <div className="summary-info" style={{ textAlign: 'center' }}>
                            <label style={{ fontSize: '9px' }}>Conversão Total</label>
                        </div>
                    </div>
                </div>
            </div>

            {/* MONTHLY GROWTH CHART */}
            <div style={{ margin: '24px 0' }}>
                <StandardCard title="Crescimento Mensal" subtitle="Comparativo de novos cadastros vs assinaturas confirmadas.">
                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={financialData.monthlySeries}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month" fontSize={12} stroke="var(--text-muted)" />
                                <YAxis fontSize={12} stroke="var(--text-muted)" />
                                <Tooltip />
                                <Legend />
                                <Bar name="Novos Cadastros" dataKey="signups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar name="Novas Vendas" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </StandardCard>
            </div>

            {/* CHARTS SECTION */}
            <div className="charts-layout">
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button 
                    className={`nav-tab ${!activeTab ? 'active' : ''}`} 
                    onClick={() => setActiveTab(null)}
                >
                    Clientes e Receita
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'audit' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                >
                    Logs de Pagamento
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'webhooks' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('webhooks'); fetchWebhookLogs(); }}
                >
                    Webhooks Brutos
                </button>
            </div>

            {!activeTab && (
                <StandardCard 
                    title={selectedPlan ? `Clientes: Plano ${selectedPlan.toUpperCase()}` : "Todos os Clientes (Financeiro)"}
                    subtitle="Listagem detalhada dos recebimentos por organização."
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text"
                                placeholder="Busca inteligente (Nome, Email, ID)..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', height: '40px', padding: '0 12px 0 40px', background: 'var(--bg-dark)', 
                                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select 
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{ 
                                    height: '40px', padding: '0 12px', background: 'var(--bg-dark)', 
                                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                                }}
                            >
                                <option value="all">Filtrar por Mês (Todos)</option>
                                {months.map((m: string) => (
                                    <option key={m} value={m}>{new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>
                                ))}
                            </select>
                            {selectedPlan && (
                                <button className="btn-ghost" onClick={() => setSelectedPlan(null)}>Limpar Plano</button>
                            )}
                        </div>
                    </div>
                    <ModernTable 
                        columns={columns} 
                        data={filteredOrganizations} 
                        loading={loading}
                        onRowClick={(org) => setDetailOrg(org)}
                    />
                </StandardCard>
            )}

            {selectedOrg && (
                <OrganizationManageModal 
                    organization={selectedOrg} 
                    onClose={() => setSelectedOrg(null)} 
                    onUpdate={fetchData}
                />
            )}

            {detailOrg && (
                <OrganizationDetailModal 
                    organization={detailOrg} 
                    onClose={() => setDetailOrg(null)} 
                    onUpdate={fetchData}
                />
            )}

            {activeTab === 'audit' && (
                <StandardCard title="Auditoria de Pagamentos" subtitle="Log cumulativo de ativações automáticas via Gateways.">
                    <ModernTable 
                        columns={[
                            { header: 'Data', accessor: (log: any) => new Date(log.created_at).toLocaleString('pt-BR'), align: 'center' },
                            { header: 'E-mail', accessor: (log: any) => log.details?.email, align: 'center' },
                            { header: 'Plano', accessor: (log: any) => (log.details?.plan || '').toUpperCase(), align: 'center' },
                            { header: 'Gateway', accessor: (log: any) => (log.details?.gateway || 'N/A').toUpperCase(), align: 'center' },
                            { header: 'ID Transação', accessor: (log: any) => <code style={{ fontSize: '10px' }}>{log.record_id}</code>, align: 'center' }
                        ]} 
                        data={auditLogs} 
                        loading={loading}
                    />
                </StandardCard>
            )}

            {activeTab === 'webhooks' && (
                <StandardCard title="Webhooks Recebidos" subtitle="Logs brutos das comunicações entre Gateways e PedObra.">
                    <ModernTable 
                        columns={[
                            { header: 'Data', accessor: (log: any) => new Date(log.created_at).toLocaleString('pt-BR'), align: 'center' },
                            { header: 'Gateway', accessor: (log: any) => (log.gateway || 'N/A').toUpperCase(), align: 'center' },
                            { 
                                header: 'Status', 
                                accessor: (log: any) => (
                                    <span style={{ 
                                        color: log.status === 'success' ? '#10b981' : '#ef4444',
                                        fontWeight: 700
                                    }}>{(log.status || 'ERROR').toUpperCase()}</span>
                                ),
                                align: 'center' 
                            },
                            { 
                                header: 'Payload', 
                                accessor: (log: any) => (
                                    <button 
                                        className="btn-ghost small" 
                                        onClick={() => { console.log(log.payload); alert('Ver log no console do navegador (F12)'); }}
                                    >Visualizar JSON</button>
                                ), 
                                align: 'center' 
                            }
                        ]} 
                        data={webhookLogs} 
                        loading={loading}
                    />
                </StandardCard>
            )}

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

                .summary-grid-saas { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    grid-template-rows: repeat(2, 1fr);
                    gap: 12px; 
                }
                .summary-card { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 12px; 
                    padding: 16px; display: flex; align-items: center; gap: 12px; position: relative;
                }
                .summary-card.gold { border-color: var(--primary); }
                .summary-card.success { border-color: #10b981; }
                .summary-icon { 
                    width: 40px; height: 40px; border-radius: 10px; 
                    background: var(--bg-dark); display: flex; align-items: center; justify-content: center;
                    color: var(--primary); border: 1px solid var(--border);
                }
                .summary-info label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
                .summary-info strong { font-size: 18px; font-weight: 800; display: block; margin-top: 2px; }
                .trend-icon { position: absolute; top: 12px; right: 12px; color: var(--status-active); opacity: 0.6; }

                .nav-tab {
                    padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px;
                    background: var(--bg-dark); color: var(--text-muted); font-size: 12px; font-weight: 700;
                    cursor: pointer; transition: all 0.2s;
                }
                .nav-tab.active { 
                    background: var(--primary); 
                    color: #ffffff !important; 
                    border-color: var(--primary); 
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
                .nav-tab:hover:not(.active) { border-color: var(--primary); color: var(--primary); }

                .btn-ghost.small { padding: 4px 8px; font-size: 10px; }

                .charts-layout { 
                    display: grid; 
                    grid-template-columns: 1.5fr 1fr; 
                    gap: 24px; 
                    margin: 24px 0; 
                }

                @media (max-width: 1200px) {
                    .finance-grid { grid-template-columns: 1fr; }
                    .charts-layout { grid-template-columns: 1fr !important; }
                }

                @media (max-width: 768px) {
                    .financeiro-master { padding: 0; }
                    .summary-grid-saas { grid-template-columns: 1fr !important; grid-template-rows: auto; }
                    .dashboard-header { flex-direction: column; align-items: flex-start !important; gap: 12px; }
                    .page-title { font-size: 20px !important; }
                    .summary-info strong { font-size: 20px; }
                    .input-group-saas input { font-size: 16px; }
                    .btn-primary { width: 100%; justify-content: center; }
                }
            `}</style>
        </div>
    );
};

export default MasterFinanceiro;
