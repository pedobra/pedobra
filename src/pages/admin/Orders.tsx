import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Trash2, FileDown, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { generateOrderPDF } from '../../lib/generateOrderPDF';

const AdminOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchOrders();
        setSelectedIds([]);
        
        const poll = setInterval(fetchOrders, 30000);
        return () => clearInterval(poll);
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, sites(*), profiles(*)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            console.error('Erro:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}-${seq}`;
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Excluir este pedido?')) return;
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) fetchOrders();
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Deseja excluir permanentemente os ${selectedIds.length} pedidos selecionados? Esta ação não pode ser desfeita.`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('orders').delete().in('id', selectedIds);
            if (error) throw error;
            
            setSelectedIds([]);
            fetchOrders();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        // Filtro de Data
        if (startDate && new Date(order.created_at) < new Date(startDate)) return false;
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(order.created_at) > end) return false;
        }

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        
        // Busca Básica (Ref, Obra, Solicitante)
        const matchBasic = getOrderRef(order).toLowerCase().includes(term) ||
            (order.sites?.name || '').toLowerCase().includes(term) ||
            (order.profiles?.name || '').toLowerCase().includes(term);
        if (matchBasic) return true;

        // Busca por Status (traduzido)
        const statusMap: Record<string, string> = {
            new: 'novo',
            pending: 'pendente',
            approved: 'aprovado',
            denied: 'negado',
            'não autorizado': 'negado',
            completed: 'concluído',
            partial: 'parcial',
            'rec. parcial': 'parcial'
        };
        if (statusMap[order.status]?.includes(term) || order.status.toLowerCase().includes(term)) return true;

        // Busca por Itens
        const hasItem = order.items?.some((it: any) => 
            (it.name || '').toLowerCase().includes(term)
        );
        if (hasItem) return true;

        // Busca por Valor Total (se disponível)
        const total = order.items?.reduce((acc: number, it: any) => {
            const val = typeof it.unit_value === 'string' ? (parseFloat(it.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0) : (it.unit_value || 0);
            const qty = parseFloat(it.received_quantity) || parseFloat(it.quantity) || 0;
            return acc + (val * qty);
        }, 0) || 0;
        if (total > 0 && total.toFixed(2).replace('.', ',').includes(term)) return true;

        return false;
    });

    const columns = [
        {
            header: 'REF',
            accessor: (order: any) => <span className="ref-column-text">{getOrderRef(order)}</span>
        },
        {
            header: 'Obra',
            accessor: (order: any) => <strong className="site-name-main">{order.sites?.name || '—'}</strong>
        },
        {
            header: 'Solicitado Por',
            accessor: (order: any) => order.profiles?.name || 'Admin'
        },
        {
            header: 'Itens',
            accessor: (order: any) => <span className="items-count">{order.items?.length || 0} materiais</span>
        },
        {
            header: 'Status',
            accessor: (order: any) => <StatusBadge status={order.status} />
        },
        {
            header: 'Ações',
            accessor: (order: any) => (
                <div className="action-btns" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => generateOrderPDF(order, order.profiles?.name || 'Admin')} title="PDF"><FileDown size={14} /></button>
                    <button className="icon-btn" onClick={() => navigate(`/admin/orders/editar/${order.id}`)} title="Editar"><Edit2 size={14} /></button>
                    <button className="icon-btn delete" onClick={(e) => handleDelete(order.id, e)} title="Excluir"><Trash2 size={14} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="orders-view animate-fade">
            <header className="dashboard-header-modern">
                <div className="header-info-main">
                    <h1 className="page-title">Gestão de Pedidos</h1>
                    <p className="page-subtitle">Gerencie e autorize as solicitações de materiais de suas obras.</p>
                </div>
                <button className="btn-primary-mobile-top" onClick={() => navigate('/admin/orders/novo')}>
                    Novo Pedido
                </button>
            </header>

            <div className="filters-hub-premium">
                <div className="search-group-main">
                    <div className="search-bar-modern">
                        <Search size={18} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Busca inteligente (Nº, Material, Status, Valor...)" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="date-filters-group">
                    <div className="date-input-wrapper">
                        <span className="date-label">DE</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="date-input-wrapper">
                        <span className="date-label">ATÉ</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    {(startDate || endDate || searchTerm) && (
                        <button className="btn-clear-filters" onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}>
                            Limpar
                        </button>
                    )}
                </div>

                <button className="btn-primary desktop-only" onClick={() => navigate('/admin/orders/novo')}>
                    Novo Pedido
                </button>
            </div>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-floating animate-pop-in">
                    <div className="bulk-content-glass">
                        <div className="selection-count">
                            <span className="count-pill">{selectedIds.length}</span>
                            <span className="count-label">{selectedIds.length === 1 ? 'Pedido Selecionado' : 'Pedidos Selecionados'}</span>
                        </div>
                        <div className="bulk-divider" />
                        <div className="bulk-btns-hub">
                            <button className="btn-bulk-delete" onClick={handleBulkDelete}>
                                <Trash2 size={18} />
                                <span>Excluir Selecionados</span>
                            </button>
                            <button className="btn-bulk-cancel" onClick={() => setSelectedIds([])}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StandardCard
                subtitle={`Total de ${filteredOrders.length} pedidos encontrados.`}
            >
                <div className="table-view-container animate-fade">
                    <ModernTable 
                        columns={columns} 
                        data={filteredOrders} 
                        loading={loading} 
                        selectable={true}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onRowClick={(order) => navigate(`/admin/orders/visualizar/${order.id}`)}
                    />
                </div>
            </StandardCard>

            <style>{`
                .orders-view { display: flex; flex-direction: column; gap: 24px; padding: 0 4px; }
                
                .dashboard-header-modern { 
                    display: flex; justify-content: space-between; align-items: flex-start; 
                    margin-bottom: 8px; 
                }
                
                .filters-hub-premium {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: var(--bg-card);
                    padding: 16px;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }

                .search-group-main { flex: 1; min-width: 280px; }
                .search-bar-modern {
                    background: var(--bg-dark);
                    border: 1.5px solid var(--border);
                    border-radius: 12px;
                    padding: 0 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    height: 48px;
                    transition: 0.2s;
                }
                .search-bar-modern:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1); }
                .search-bar-modern input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; font-weight: 500; }

                .date-filters-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                .date-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: var(--bg-dark);
                    border: 1.5px solid var(--border);
                    border-radius: 12px;
                    height: 48px;
                    padding: 0 12px;
                    gap: 8px;
                }
                .date-label { font-size: 10px; font-weight: 850; color: var(--text-muted); }
                .date-input-wrapper input {
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    outline: none;
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .btn-clear-filters {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                    padding: 0 16px;
                    height: 32px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btn-clear-filters:hover { color: var(--text-primary); border-color: var(--text-muted); }

                .btn-primary-mobile-top { display: none; }
                .desktop-only { display: flex; }

                @media (max-width: 768px) {
                    .dashboard-header-modern { flex-direction: column; gap: 16px; }
                    .btn-primary-mobile-top { display: flex; width: 100%; height: 48px; justify-content: center; align-items: center; }
                    .desktop-only { display: none; }
                    .filters-hub-premium { flex-direction: column; align-items: stretch; gap: 12px; padding: 12px; }
                    .search-group-main { min-width: 100%; }
                    .date-filters-group { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .date-input-wrapper { width: 100%; justify-content: space-between; }
                    .btn-clear-filters { grid-column: span 2; height: 40px; margin-top: 4px; }
                }

                .ref-column-text { 
                    font-size: 14px; 
                    font-weight: 850; 
                    color: var(--text-primary);
                    letter-spacing: -0.01em;
                }
                .site-name-main {
                    font-size: 14px;
                    font-weight: 850;
                    text-transform: uppercase;
                }
                .items-count { font-size: 13px; color: var(--text-muted); }
                
                .action-btns { display: flex; gap: 6px; justify-content: center; }
                .icon-btn { 
                    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); 
                    padding: 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; 
                    display: flex; align-items: center; justify-content: center;
                }
                .icon-btn:hover { color: var(--text-primary); border-color: var(--border-bright); background: var(--bg-dark); }
                .icon-btn.delete:hover { background: #FEF2F2; color: var(--status-denied); border-color: #FEE2E2; }

                /* Floating Bulk Bar Premium */
                .bulk-actions-floating {
                    position: fixed;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    width: auto;
                    min-width: 400px;
                }
                .bulk-content-glass {
                    background: rgba(var(--bg-card-rgb), 0.85);
                    backdrop-filter: blur(12px) saturate(180%);
                    border: 1px solid var(--primary);
                    border-radius: 24px;
                    padding: 8px 12px 8px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 20px rgba(var(--primary-rgb), 0.1);
                }
                .selection-count { display: flex; align-items: center; gap: 12px; }
                .count-pill {
                    background: var(--primary);
                    color: var(--bg-dark);
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    font-weight: 900;
                    font-size: 14px;
                }
                .count-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .bulk-divider {
                    width: 1px;
                    height: 32px;
                    background: var(--border);
                }
                .bulk-btns-hub { display: flex; align-items: center; gap: 8px; }
                .btn-bulk-delete {
                    background: #EF4444;
                    color: white;
                    border: none;
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 800;
                    font-size: 14px;
                    cursor: pointer;
                    transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
                }
                .btn-bulk-delete:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
                }
                .btn-bulk-delete:active { transform: translateY(0); }
                
                .btn-bulk-cancel {
                    background: transparent;
                    color: var(--text-muted);
                    border: none;
                    height: 44px;
                    padding: 0 16px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: 0.2s;
                    border-radius: 12px;
                }
                .btn-bulk-cancel:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.05);
                }

                .animate-pop-in {
                    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default AdminOrders;
