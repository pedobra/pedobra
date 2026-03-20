import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CreditCard, ShieldCheck, Globe, Search } from 'lucide-react';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

const MasterDashboard = () => {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrgs = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setOrganizations(data || []);
            } catch (err) {
                console.error('Erro ao buscar organizações:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgs();
    }, []);

    const filteredOrgs = useMemo(() => {
        return organizations.filter(org => 
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (org.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [organizations, searchTerm]);

    const stats = useMemo(() => {
        return organizations.reduce((acc, curr) => {
            acc.total++;
            const plan = curr.plan_id || 'free';
            if (plan === 'pro' || plan === 'professional') acc.pro++;
            else if (plan === 'basic') acc.basic++;
            else acc.free++;
            return acc;
        }, { total: 0, pro: 0, basic: 0, free: 0 });
    }, [organizations]);

    const getRemainingDays = (endDate: string | null) => {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const columns = [
        { header: 'Cliente', accessor: (org: any) => <strong>{org.name}</strong> },
        { 
            header: 'Plano', 
            accessor: (org: any) => (
                <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: org.plan_id === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(108, 117, 125, 0.1)',
                    color: org.plan_id === 'pro' ? 'var(--status-active)' : 'var(--text-muted)'
                }}>
                    {org.plan_id || 'FREE'}
                </span>
            )
        },
        { 
            header: 'Expira em', 
            accessor: (org: any) => {
                const days = getRemainingDays(org.trial_end);
                if (days === null) return <span style={{ color: 'var(--text-muted)' }}>Vitalício/N/A</span>;
                return (
                    <span style={{ color: days < 7 ? 'var(--status-cancelled)' : 'var(--text-primary)' }}>
                        {days} dias
                    </span>
                );
            }
        },
        { 
            header: 'Status', 
            accessor: (org: any) => (
                <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: org.subscription_status === 'active' ? 'var(--status-active)' : 'var(--status-cancelled)'
                }}>
                    <div style={{ 
                        width: 8, height: 8, borderRadius: '50%', 
                        background: org.subscription_status === 'active' ? 'var(--status-active)' : 'var(--status-cancelled)' 
                    }} />
                    {org.subscription_status === 'active' ? 'Ativo' : 'Suspenso'}
                </span>
            )
        },
        {
            header: 'Ações',
            accessor: () => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="icon-btn" style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}>Gerenciar</button>
                </div>
            )
        }
    ];

    return (
        <div className="master-dashboard animate-fade">
            <header className="dashboard-header" style={{ marginBottom: '32px' }}>
                <div className="header-info">
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldCheck size={32} color="var(--primary)" />
                        Painel de Controle Master
                    </h1>
                    <p className="page-subtitle">Gestão centralizada de todos os clientes e assinaturas da plataforma.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas" style={{ width: '300px' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou slug..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="stats-layout" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px' }}>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><Globe size={20} color="var(--primary)" /></div>
                    <div className="stat-data">
                        <label>Total de Clientes</label>
                        <strong>{stats.total}</strong>
                    </div>
                </div>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><ShieldCheck size={20} color="var(--status-active)" /></div>
                    <div className="stat-data">
                        <label>Plano Profissional</label>
                        <strong>{stats.pro}</strong>
                    </div>
                </div>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><CreditCard size={20} color="var(--status-pending)" /></div>
                    <div className="stat-data">
                        <label>Plano Básico</label>
                        <strong>{stats.basic}</strong>
                    </div>
                </div>
                <div className="stat-card-saas">
                    <div className="stat-icon-bg"><Users size={20} color="var(--text-muted)" /></div>
                    <div className="stat-data">
                        <label>Plano Gratuito</label>
                        <strong>{stats.free}</strong>
                    </div>
                </div>
            </div>

            <StandardCard title="Gestão de Assinaturas" subtitle="Lista completa de organizações e status de faturamento.">
                <ModernTable 
                    columns={columns} 
                    data={filteredOrgs} 
                    loading={loading}
                />
            </StandardCard>

            <style>{`
                .master-dashboard { max-width: 1400px; margin: 0 auto; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; }
                .header-actions { display: flex; gap: 12px; }
                .search-bar-saas { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 8px; 
                    padding: 0 12px; display: flex; align-items: center; gap: 8px; 
                    height: 44px;
                }
                .search-bar-saas input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }
                
                .stats-layout { display: grid; gap: 16px; }
                .stat-card-saas { 
                    background: var(--bg-card); border: 2px solid var(--border); border-radius: 12px; 
                    padding: 24px; display: flex; align-items: center; gap: 16px;
                    transition: 0.2s;
                }
                .stat-card-saas:hover { border-color: var(--primary); transform: translateY(-2px); }
                .stat-icon-bg { 
                    width: 48px; height: 48px; border-radius: 12px; background: var(--bg-dark); 
                    display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);
                }
                .stat-data { display: flex; flex-direction: column; gap: 2px; }
                .stat-data label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
                .stat-data strong { font-size: 28px; font-weight: 800; color: var(--text-primary); }
            `}</style>
        </div>
    );
};

export default MasterDashboard;
