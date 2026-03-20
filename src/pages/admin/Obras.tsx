import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Search, MapPin, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';

const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const AdminObras = () => {
    const navigate = useNavigate();
    const [obras, setObras] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode] = useState<'table' | 'cards'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { maxSites } = useSubscription();

    const isLimitReached = maxSites ? obras.length >= maxSites : false;

    useEffect(() => {
        fetchObras();
        setSelectedIds([]);
    }, []);

    const fetchObras = async () => {
        setLoading(true);
        try {
            const { data: sites, error: sitesError } = await supabase
                .from('sites')
                .select('*')
                .order('name');

            if (sitesError) throw sitesError;

            // Buscamos os pedidos para calcular o valor utilizado real
            const { data: orders } = await supabase
                .from('orders')
                .select('site_id, items')
                .in('status', ['approved', 'completed', 'partial']);

            const totalsBySite: Record<string, { used: number, count: number }> = {};
            
            (orders || []).forEach(order => {
                if (!totalsBySite[order.site_id]) {
                    totalsBySite[order.site_id] = { used: 0, count: 0 };
                }
                
                totalsBySite[order.site_id].count++;
                
                const items = (order.items as any[]) || [];
                const orderTotal = items.reduce((acc, item) => {
                    const price = parseFloat(item.unit_value || item.price_hint) || 0;
                    // Somamos apenas o que foi de fato recebido (received_quantity)
                    const qty = parseFloat(item.received_quantity || 0) || 0;
                    return acc + (price * qty);
                }, 0);
                
                totalsBySite[order.site_id].used += orderTotal;
            });

            const enriched = (sites || []).map(o => ({
                ...o,
                orderCount: totalsBySite[o.id]?.count || 0,
                budget: o.settings?.budget_planned || 0,
                usedValue: totalsBySite[o.id]?.used || 0
            }));
            
            setObras(enriched);
        } catch (error: any) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Deseja excluir permanentemente as ${selectedIds.length} obras selecionadas? Esta ação não pode ser desfeita.`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('sites').delete().in('id', selectedIds);
            if (error) throw error;
            
            setSelectedIds([]);
            fetchObras();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (obra: any) => {
        navigate(`/admin/sites/editar/${obra.id}`);
    };

    const filteredObras = obras.filter(o => {
        const addrText = typeof o.address === 'object' ? o.address?.full : o.address;
        return (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
               (addrText || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    const columns: any[] = [
        {
            header: 'Nome da Obra',
            align: 'left',
            accessor: (obra: any) => (
                <div className="obra-identity">
                    <div className="obra-icon-mini"><Building2 size={14} /></div>
                    <div className="obra-texts">
                        <strong className="obra-name-main">{obra.name}</strong>
                        <span className="text-muted-xs">
                            {typeof obra.address === 'object' ? obra.address?.full : (obra.address || 'Endereço não informado')}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Pedidos',
            align: 'center',
            accessor: (obra: any) => <StatusBadge status={obra.orderCount > 0 ? 'active' : 'pending'} label={`${obra.orderCount} Pedidos`} />
        },
        {
            header: 'Orçamento',
            align: 'center',
            accessor: (obra: any) => {
                const consumedPercent = obra.budget > 0 ? Math.round((obra.usedValue / obra.budget) * 100) : 0;
                const balance = (obra.budget || 0) - (obra.usedValue || 0);
                
                return (
                    <div className="budget-stack-modern">
                        <div className="budget-main-row">
                            <div className="budget-item">
                                <span className="label-tiny">ORÇAMENTO</span>
                                <span className="val-num">{fmtBRL(obra.budget)}</span>
                            </div>
                            <div className="budget-item">
                                <span className="label-tiny">GASTO</span>
                                <span className="val-num">{fmtBRL(obra.usedValue)}</span>
                            </div>
                            <div className="budget-item">
                                <span className="label-tiny">SALDO</span>
                                <span className="val-num highlight" style={{ color: balance < 0 ? 'var(--status-denied)' : 'var(--primary)' }}>
                                    {fmtBRL(balance)}
                                </span>
                            </div>
                        </div>
                        <div className="progress-area">
                            <div className="progress-bar-container">
                                <div 
                                    className="progress-bar-fill" 
                                    style={{ 
                                        width: `${Math.min(consumedPercent, 100)}%`,
                                        backgroundColor: consumedPercent > 100 ? 'var(--status-denied)' : 'var(--primary)'
                                    }} 
                                />
                            </div>
                            <span className="progress-info">{consumedPercent}% do orçamento consumido</span>
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Ações',
            align: 'right',
            accessor: (obra: any) => (
                <div className="table-actions-btns" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={() => navigate(`/admin/sites/editar/${obra.id}`)} title="Editar"><Edit2 size={16} /></button>
                    <button className="icon-btn" style={{ color: 'var(--status-denied)' }} onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Remover obra?')) {
                            await supabase.from('sites').delete().eq('id', obra.id);
                            fetchObras();
                        }
                    }} title="Remover"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="obras-view animate-fade">
            <header className="dashboard-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Obras</h1>
                    <p className="page-subtitle">Gerencie e acompanhe o progresso de todas as obras ativas.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Buscar obras..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {isLimitReached && (
                        <span className="limit-warning">Limite do plano atingido ({obras.length}/{maxSites})</span>
                    )}
                    <button 
                        className="btn-primary" 
                        onClick={() => navigate('/admin/sites/novo')}
                        disabled={isLimitReached}
                        title={isLimitReached ? "Limite de obras do seu plano atingido" : ""}
                    >
                        Nova Obra
                    </button>
                </div>
            </header>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-bar animate-slide-down">
                    <div className="selection-info">
                        <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'obra selecionada' : 'obras selecionadas'}
                    </div>
                    <div className="bulk-btns">
                        <button className="btn-danger-ghost" onClick={handleBulkDelete}>
                            <Trash2 size={16} /> Excluir Selecionados
                        </button>
                        <button className="btn-text" onClick={() => setSelectedIds([])}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <StandardCard>
                {viewMode === 'table' ? (
                    <div className="table-view-container animate-fade">
                        <ModernTable 
                            columns={columns} 
                            data={filteredObras} 
                            loading={loading} 
                            selectable={true}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />
                    </div>
                ) : (
                    <div className="obras-grid-saas">
                        {filteredObras.map(obra => (
                            <div key={obra.id} className="obra-card-saas clickable-card" onClick={() => handleEdit(obra)}>
                                <div className="card-top">
                                    <h3>{obra.name}</h3>
                                    <div className="card-actions-mini" onClick={e => e.stopPropagation()}>
                                        <button className="card-icon-action" onClick={() => handleEdit(obra)}><Edit2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="card-mid">
                                    <StatusBadge status="active" label={`${obra.orderCount} Pedidos`} />
                                </div>
                                <div className="card-address">
                                    <MapPin size={12} />
                                    <span>
                                        {typeof obra.address === 'object' ? obra.address?.full : (obra.address || 'Endereço não informado')}
                                    </span>
                                </div>
                                <div className="card-budget-info">
                                    <label>ORÇAMENTO TOTAL</label>
                                    <strong>{fmtBRL(obra.budget)}</strong>
                                </div>
                            </div>
                        ))}
                        <div className="add-site-card-saas" onClick={() => navigate('/admin/sites/novo')}>
                            <Plus size={24} />
                            <span>Adicionar nova obra</span>
                        </div>
                    </div>
                )}
            </StandardCard>

            <style>{`
                .obras-view { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                
                .header-actions { display: flex; align-items: center; gap: 12px; }
                .search-bar-saas { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 8px; 
                    padding: 0 12px; display: flex; align-items: center; gap: 8px; 
                    width: 240px; height: 44px; 
                }
                .search-bar-saas input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }

                .obra-identity { display: flex; align-items: center; gap: 12px; }
                .obra-icon-mini { width: 32px; height: 32px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-primary); }
                .obra-texts { display: flex; flex-direction: column; text-align: left; }
                .obra-name-main { font-size: 14px; font-weight: 850; letter-spacing: -0.02em; }
                .text-muted-xs { font-size: 11px; color: var(--text-muted); font-weight: 500; }

                .budget-stack-modern { display: flex; flex-direction: column; gap: 8px; min-width: 280px; padding: 4px 0; }
                .budget-main-row { display: flex; justify-content: space-between; gap: 16px; }
                .budget-item { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
                .label-tiny { font-size: 9px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
                .val-num { font-size: 13px; font-weight: 800; color: var(--text-primary); }
                .val-num.highlight { font-size: 14px; }

                .progress-area { display: flex; flex-direction: column; gap: 4px; }
                .progress-bar-container { height: 6px; background: var(--bg-dark); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
                .progress-bar-fill { height: 100%; border-radius: 10px; transition: width 0.5s ease-out; }
                .progress-info { font-size: 10px; font-weight: 700; color: var(--text-muted); }

                .obras-grid-saas { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; padding: 24px; }
                .obra-card-saas { 
                    padding: 20px; border-radius: 12px; border: 1px solid var(--border); 
                    background: var(--bg-card); display: flex; flex-direction: column; gap: 16px;
                    box-shadow: var(--shadow-sm); transition: 0.2s;
                }
                .obra-card-saas:hover { border-color: var(--border-bright); box-shadow: var(--shadow-premium); }
                
                .obra-card-saas h3 { font-size: 16px; margin: 0; font-weight: 600; color: var(--text-primary); }
                .card-address { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 12px; }
                
                .card-budget-info { border-top: 1px solid var(--border); padding-top: 16px; display: flex; flex-direction: column; gap: 4px; }
                .card-budget-info label { font-size: 10px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em; }
                .card-budget-info strong { font-size: 16px; color: var(--text-primary); }

                .add-site-card-saas { 
                    border: 2px dashed var(--border); border-radius: 12px; display: flex; flex-direction: column; 
                    align-items: center; justify-content: center; gap: 12px; cursor: pointer; 
                    color: var(--text-muted); min-height: 180px; transition: 0.2s;
                }
                .add-site-card-saas:hover { border-color: var(--text-muted); background: var(--bg-dark); color: var(--text-primary); }


                .table-actions-btns { display: flex; gap: 8px; }

                .limit-warning {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--status-denied);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: rgba(var(--status-denied-rgb), 0.1);
                    padding: 4px 12px;
                    border-radius: 6px;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }
            `}</style>
        </div>
    );
};

export default AdminObras;
