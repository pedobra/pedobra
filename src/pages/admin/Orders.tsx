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

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('orders')
                .select('*, sites(*), profiles(*)')
                .order('created_at', { ascending: false });
            if (data) setOrders(data);
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
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Manage and authorize material requests from your construction sites.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-saas">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/orders/novo')}>
                        New order
                    </button>
                </div>
            </header>

            <StandardCard>
                <ModernTable columns={columns} data={filteredOrders} loading={loading} />
            </StandardCard>

            <style>{`
                .orders-view { display: flex; flex-direction: column; gap: 32px; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .page-title { font-size: 32px; font-weight: 700; color: #111827; letter-spacing: -0.02em; }
                .page-subtitle { color: #6B7280; font-size: 14px; margin-top: 4px; }
                
                .header-actions { display: flex; align-items: center; gap: 12px; }
                .search-bar-saas { 
                    background: #FFF; border: 1.5px solid #E5E7EB; border-radius: 8px; 
                    padding: 0 12px; display: flex; align-items: center; gap: 8px; 
                    width: 240px; height: 40px; 
                }
                .search-bar-saas input { background: transparent; border: none; color: #111827; outline: none; width: 100%; font-size: 14px; }

                .ref-badge { 
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
                    background: #F3F4F6; padding: 2px 6px; border-radius: 4px; color: #374151; 
                    font-size: 11px; font-weight: 600; 
                }
                .items-count { font-size: 13px; color: #6B7280; }
                
                .action-btns { display: flex; gap: 6px; justify-content: flex-end; }
                .icon-btn { 
                    background: #FFF; border: 1px solid #E5E7EB; color: #6B7280; 
                    padding: 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; 
                    display: flex; align-items: center; justify-content: center;
                }
                .icon-btn:hover { color: #111827; border-color: #D1D5DB; background: #F9FAFB; }
                .icon-btn.delete:hover { background: #FEF2F2; color: #EF4444; border-color: #FEE2E2; }
            `}</style>
        </div>
    );
};

export default AdminOrders;
