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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchOrders();
        setSelectedIds([]);
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
        return `${dd}${mm}_${seq}`;
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
        const term = searchTerm.toLowerCase();
        return getOrderRef(order).toLowerCase().includes(term) ||
            (order.sites?.name || '').toLowerCase().includes(term) ||
            (order.profiles?.name || '').toLowerCase().includes(term);
    });

    const columns = [
        {
            header: 'REF',
            accessor: (order: any) => <span className="ref-badge">{getOrderRef(order)}</span>
        },
        {
            header: 'Obra',
            accessor: (order: any) => <strong>{order.sites?.name || '—'}</strong>
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
            <header className="dashboard-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Pedidos</h1>
                    <p className="page-subtitle">Gerencie e autorize as solicitações de materiais de suas obras.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Buscar pedidos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/orders/novo')}>
                        Novo Pedido
                    </button>
                </div>
            </header>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-bar animate-slide-down">
                    <div className="selection-info">
                        <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
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
                    />
                </div>
            </StandardCard>

            <style>{`
                .orders-view { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                
                .header-actions { display: flex; align-items: center; gap: 12px; }
                .search-bar-saas { 
                    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 8px; 
                    padding: 0 12px; display: flex; align-items: center; gap: 8px; 
                    width: 240px; height: 44px; 
                }
                .search-bar-saas input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }

                .ref-badge { 
                    font-family: var(--font-main); 
                    background: var(--bg-dark); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); 
                    font-size: 11px; font-weight: 600; 
                }
                .items-count { font-size: 13px; color: var(--text-muted); }
                
                .action-btns { display: flex; gap: 6px; justify-content: flex-end; }
                .icon-btn { 
                    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); 
                    padding: 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; 
                    display: flex; align-items: center; justify-content: center;
                }
                .icon-btn:hover { color: var(--text-primary); border-color: var(--border-bright); background: var(--bg-dark); }
                .icon-btn.delete:hover { background: #FEF2F2; color: var(--status-denied); border-color: #FEE2E2; }
            `}</style>
        </div>
    );
};

export default AdminOrders;
