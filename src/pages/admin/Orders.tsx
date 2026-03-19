import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Trash2, FileDown, Edit2 } from 'lucide-react';
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
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Pedidos</h1>
                    <p className="page-subtitle">Acompanhe e autorize solicitações de materiais em tempo real.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={18} color="var(--text-muted)" />
                        <input type="text" placeholder="Buscar por REF ou Obra..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/orders/novo')}>
                        <Plus size={20} /> Novo Pedido
                    </button>
                </div>
            </header>

            <StandardCard 
                title="Fluxo de Materiais" 
                subtitle={`Exibindo ${filteredOrders.length} pedidos registrados no ecossistema.`}
            >
                <ModernTable columns={columns} data={filteredOrders} loading={loading} />
            </StandardCard>

            <style>{`
                .orders-view { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 850; margin-bottom: 6px; letter-spacing: -0.5px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 16px; align-items: center; }
                .search-bar-glass { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 0 16px; display: flex; align-items: center; gap: 12px; width: 280px; height: 44px; }
                .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 13px; }
                
                .ref-badge { font-family: monospace; background: rgba(var(--primary-rgb), 0.05); padding: 4px 8px; border-radius: 6px; color: var(--primary); font-weight: 700; border: 1px solid rgba(var(--primary-rgb), 0.2); }
                .items-count { font-size: 12px; color: var(--text-muted); font-weight: 600; }
                
                .action-btns { display: flex; gap: 8px; justify-content: flex-end; }
                .icon-btn { background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .icon-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
                .icon-btn.delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }
            `}</style>
        </div>
    );
};

export default AdminOrders;
