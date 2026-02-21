import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CheckCircle, XCircle, Search, ClipboardList, Trash2, Send, FileDown, Edit2, History, ArrowLeft, Building2, User, Calendar, Check, FileText, Sparkles } from 'lucide-react';
import { generateOrderPDF } from '../../lib/generateOrderPDF';

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [historyOrder, setHistoryOrder] = useState<any>(null);
    const [priceSuggestions, setPriceSuggestions] = useState<Record<string, { supplierName: string; unitValue: number }>>({});
    const [loadingPrices, setLoadingPrices] = useState(false);

    const normalizeName = (name: string) =>
        name.replace(/^\[COMPLEMENTO REF [\w_]+\]\s*/i, '').trim().toLowerCase();

    const isPending = (status: string) => status === 'new' || status === 'pending';

    useEffect(() => {
        if (!viewingOrder) { setPriceSuggestions({}); return; }

        // Se não for pendente, lê os hints já persistidos nos itens (fixo)
        if (!isPending(viewingOrder.status)) {
            const stored: Record<string, { supplierName: string; unitValue: number }> = {};
            (viewingOrder.items || []).forEach((item: any) => {
                if (item.price_hint && item.price_hint_supplier) {
                    stored[item.name] = { supplierName: item.price_hint_supplier, unitValue: item.price_hint };
                }
            });
            setPriceSuggestions(stored);
            return;
        }

        // Status pendente: busca ao vivo e persiste nos itens
        const items = viewingOrder.items || [];
        if (items.length === 0) return;
        const fetchPrices = async () => {
            setLoadingPrices(true);
            const since = new Date();
            since.setDate(since.getDate() - 15);
            const [{ data: recentOrders }, { data: suppliersData }] = await Promise.all([
                supabase.from('orders').select('items, received_at').in('status', ['completed', 'partial']).gte('received_at', since.toISOString()),
                supabase.from('suppliers').select('id, name'),
            ]);
            const supplierMap: Record<string, string> = {};
            suppliersData?.forEach((s: any) => { supplierMap[s.id] = s.name; });
            const priceMap: Record<string, { supplierName: string; unitValue: number }[]> = {};
            recentOrders?.forEach((order: any) => {
                (order.items || []).forEach((it: any) => {
                    const uv = parseFloat(it.unit_value) || 0;
                    const sup = it.supplier_id ? supplierMap[it.supplier_id] : null;
                    if (!uv || !sup) return;
                    const key = normalizeName(it.name || '');
                    if (!key) return;
                    if (!priceMap[key]) priceMap[key] = [];
                    priceMap[key].push({ supplierName: sup, unitValue: uv });
                });
            });
            const hints: Record<string, { supplierName: string; unitValue: number }> = {};
            items.forEach((item: any) => {
                const key = normalizeName(item.name || '');
                const prices = priceMap[key];
                if (!prices || prices.length === 0) return;
                hints[item.name] = prices.reduce((a, b) => a.unitValue <= b.unitValue ? a : b);
            });
            setPriceSuggestions(hints);

            // Persiste os hints nos itens para que fiquem fixos após aprovação
            const updatedItems = items.map((item: any) => ({
                ...item,
                price_hint: hints[item.name]?.unitValue ?? item.price_hint ?? null,
                price_hint_supplier: hints[item.name]?.supplierName ?? item.price_hint_supplier ?? null,
            }));
            await supabase.from('orders').update({ items: updatedItems }).eq('id', viewingOrder.id);

            setLoadingPrices(false);
        };
        fetchPrices();
    }, [viewingOrder]);

    // New/Edit Order State
    const [selectedSite, setSelectedSite] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({ material_id: '', quantity: 0, customName: '' });
    const [isCustom, setIsCustom] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
        fetchSites();
        fetchMaterials();
    }, []);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, sites(*), profiles(*)')
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    const fetchSites = async () => {
        const { data } = await supabase.from('sites').select('*').order('name');
        if (data) setSites(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    const addItem = () => {
        if (isCustom) {
            if (!currentItem.customName) {
                alert('Por favor, descreva o material.');
                return;
            }
        } else {
            if (!currentItem.material_id) {
                alert('Por favor, selecione um material.');
                return;
            }
        }

        if (currentItem.quantity <= 0) {
            alert('A quantidade deve ser maior que zero.');
            return;
        }

        if (isCustom) {
            setItems([...items, {
                material_id: 'custom',
                quantity: currentItem.quantity,
                name: `(NOVO) ${currentItem.customName}`,
                unit: 'un'
            }]);
            setCurrentItem({ material_id: '', quantity: 0, customName: '' });
            setIsCustom(false);
        } else {
            const mat = materials.find(m => m.id === currentItem.material_id);
            if (!mat) return;

            const existing = items.find(i => i.material_id === currentItem.material_id);
            if (existing) {
                setItems(items.map(i =>
                    i.material_id === currentItem.material_id
                        ? { ...i, quantity: i.quantity + currentItem.quantity }
                        : i
                ));
            } else {
                setItems([...items, { ...currentItem, name: mat.name, unit: mat.unit }]);
            }
            setCurrentItem({ material_id: '', quantity: 0, customName: '' });
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmitOrder = async () => {
        if (!selectedSite) {
            alert('Por favor, selecione uma obra para este pedido.');
            return;
        }
        if (items.length === 0) {
            alert('Adicione pelo menos um item ao pedido.');
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            if (editingOrder) {
                const { error } = await supabase.from('orders').update({
                    site_id: selectedSite,
                    items: items
                }).eq('id', editingOrder.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('orders').insert({
                    site_id: selectedSite,
                    user_id: user?.id,
                    items: items,
                    status: 'new'
                });
                if (error) throw error;
            }

            setShowModal(false);
            setItems([]);
            setSelectedSite('');
            setEditingOrder(null);
            fetchOrders();
            alert(editingOrder ? 'Pedido atualizado com sucesso.' : 'Pedido gerado com sucesso.');

        } catch (err: any) {
            alert('Erro ao gerar pedido: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    const updateStatus = async (id: string, newStatus: string) => {
        let updatePayload: any = { status: newStatus };

        if (newStatus === 'approved') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
                updatePayload.approved_by_name = profile?.name || 'Admin';
            }
            updatePayload.approved_at = new Date().toISOString();
        }

        const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
        if (!error) fetchOrders();
        else alert('Erro ao atualizar. Você executou o SQL no Supabase para criar as colunas de aprovação/recebimento? ' + error.message);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) {
            fetchOrders();
            alert('Pedido excluído com sucesso.');
        } else {
            alert('Erro ao excluir pedido: ' + error.message);
        }
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        setSelectedSite(order.site_id);
        setItems(order.items || []);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingOrder(null);
        setSelectedSite('');
        setItems([]);
        setShowModal(true);
    };

    const exportPDF = (e: any, order: any, isHistory = false, childOrder?: any) => {
        e.stopPropagation();
        if (isHistory) {
            import('../../lib/generateHistoryOrderPDF').then(m => m.generateHistoryOrderPDF(order, order.profiles?.name || 'Admin', childOrder));
        } else {
            generateOrderPDF(order, order.profiles?.name || 'Admin');
        }
    };

    return (
        <div className="admin-orders-view">
            {historyOrder ? (() => {
                const childOrder = orders.find(o => o.items?.some((i: any) => i.name?.includes(`[COMPLEMENTO REF ${getOrderRef(historyOrder)}]`)));
                return (
                    <div style={{ padding: '20px 0' }}>
                        <header className="view-header" style={{ marginBottom: '24px' }}>
                            <div>
                                <button onClick={() => setHistoryOrder(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px', fontWeight: 'bold' }}>
                                    <ArrowLeft size={16} /> Voltar para Pedidos
                                </button>
                                <h1 className="page-title" style={{ fontSize: '28px' }}>Histórico do Pedido #{getOrderRef(historyOrder)}</h1>
                            </div>
                            <button className="btn-primary" onClick={(e) => exportPDF(e, historyOrder, true, childOrder)}>
                                <FileDown size={18} /> Gerar PDF
                            </button>
                        </header>

                        <div style={{ background: '#fff', color: '#111', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> OBRA</span>
                                    <strong style={{ fontSize: '18px' }}>{historyOrder.sites?.name || 'Desconhecida'}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><User size={12} style={{ display: 'inline', marginRight: '4px' }} /> SOLICITADO POR</span>
                                    <strong style={{ fontSize: '16px' }}>{historyOrder.profiles?.name}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> DATA DA SOLICITAÇÃO</span>
                                    <strong style={{ fontSize: '16px' }}>{new Date(historyOrder.created_at).toLocaleDateString('pt-BR')}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><Check size={12} style={{ display: 'inline', marginRight: '4px' }} /> STATUS ATUAL</span>
                                    <strong style={{ fontSize: '14px', color: (historyOrder.status === 'completed' || childOrder?.status === 'completed') ? '#27ae60' : '#f39c12' }}>
                                        {(historyOrder.status === 'completed' || childOrder?.status === 'completed') ? 'RECEBIMENTO CONCLUÍDO' : 'RECEBIMENTO PARCIAL'}
                                    </strong>
                                </div>
                                {historyOrder.approved_at && (
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><User size={12} style={{ display: 'inline', marginRight: '4px' }} /> APROVADO POR</span>
                                        <strong style={{ fontSize: '14px' }}>{historyOrder.approved_by_name} <br /> <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>{new Date(historyOrder.approved_at).toLocaleString('pt-BR')}</span></strong>
                                    </div>
                                )}
                                {historyOrder.received_at && (
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#666', fontWeight: 600, display: 'block', marginBottom: '4px' }}><CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> RECEBIDO POR</span>
                                        <strong style={{ fontSize: '14px' }}>{historyOrder.received_by_name} <br /> <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>{new Date(historyOrder.received_at).toLocaleString('pt-BR')}</span></strong>
                                    </div>
                                )}
                            </div>

                            <h3 style={{ fontSize: '14px', letterSpacing: '1px', color: '#888', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 700 }}>Resumo de Itens Originais x Recebidos</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '40px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', color: '#888' }}>MATERIAL</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', color: '#888', width: '100px', textAlign: 'center' }}>SOLICITADOS</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', color: '#888', width: '100px', textAlign: 'center' }}>RECEBIDOS</th>
                                        <th style={{ padding: '12px 16px', fontSize: '12px', color: '#888', width: '100px', textAlign: 'center' }}>FALTANTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyOrder.items?.map((it: any, i: number) => {
                                        const qty = parseFloat(it.quantity) || 0;
                                        const rec = parseFloat(it.received_quantity) || 0;
                                        const missing = qty - rec;
                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                <td style={{ padding: '16px', fontWeight: 600 }}>{it.name} <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>{it.unit}</span></td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>{qty}</td>
                                                <td style={{ padding: '16px', textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>{rec}</td>
                                                <td style={{ padding: '16px', textAlign: 'center', color: missing > 0 ? '#e74c3c' : '#ccc', fontWeight: missing > 0 ? 'bold' : 'normal' }}>{missing > 0 ? missing : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {childOrder && (
                                <div style={{ background: '#fafafa', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '14px', letterSpacing: '1px', color: '#555', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}><FileText size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Pedido Complementar Gerado Automático</h3>
                                        <span className={`status-pill ${childOrder.status}`} style={{ fontWeight: 800 }}>
                                            {childOrder.status === 'new' && 'Pendente'}
                                            {childOrder.status === 'approved' && 'Aprovado'}
                                            {childOrder.status === 'denied' && 'Negado'}
                                            {childOrder.status === 'partial' && 'Rec. Parcial'}
                                            {childOrder.status === 'completed' && 'Concluído'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>Identificador do novo pedido (contém sobras pendentes): <strong>#{getOrderRef(childOrder)}</strong> </p>

                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#333' }}>
                                        {childOrder.items?.map((it: any, idx: number) => (
                                            <li key={idx} style={{ marginBottom: '8px', fontSize: '14px' }}><strong>{it.quantity} {it.unit}</strong> - {it.name.replace(`[COMPLEMENTO REF ${getOrderRef(historyOrder)}]`, '')}</li>
                                        ))}
                                    </ul>
                                    {childOrder.status === 'completed' && childOrder.received_at && (
                                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #ccc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', color: '#555' }}><strong>Recebido por:</strong> {childOrder.received_by_name}</span>
                                            <span style={{ fontSize: '13px', color: '#555' }}><strong>Data da conclusão:</strong> {new Date(childOrder.received_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })() : (
                <>
                    <header className="view-header">
                        <div className="header-info">
                            <h1 className="page-title">Gestão de Pedidos</h1>
                            <p className="page-subtitle">Acompanhe e gere solicitações de insumos para as obras.</p>
                        </div>
                        <div className="header-actions">
                            <div className="search-bar-glass">
                                <Search size={18} color="var(--text-muted)" />
                                <input type="text" placeholder="Buscar pedidos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <button className="btn-primary" onClick={openCreateModal}>
                                <Plus size={20} /> Novo Pedido
                            </button>
                        </div>
                    </header>

                    <div className="premium-table-wrapper">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>REF</th>
                                    <th>OBRA</th>
                                    <th>SOLICITANTE</th>
                                    <th>ITENS</th>
                                    <th>DATA</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.filter(order => {
                                    const term = searchTerm.toLowerCase();
                                    return order.id.toLowerCase().includes(term) ||
                                        (order.sites?.name || '').toLowerCase().includes(term) ||
                                        (order.profiles?.name || '').toLowerCase().includes(term) ||
                                        (order.status === 'new' ? 'pendente' : order.status === 'approved' ? 'aprovado' : order.status === 'partial' ? 'parcial' : order.status === 'completed' ? 'concluído' : 'negado').includes(term);
                                }).map(order => {
                                    const childOrder = order.status === 'partial' ? orders.find(o => o.items?.some((i: any) => i.name?.includes(`[COMPLEMENTO REF ${getOrderRef(order)}]`))) : null;
                                    const isRealCompleted = order.status === 'completed' || (order.status === 'partial' && childOrder?.status === 'completed');
                                    const finalUiStatus = isRealCompleted ? 'completed' : order.status;

                                    return (
                                        <tr key={order.id} className="clickable-row" onClick={() => setViewingOrder(order)}>
                                            <td>
                                                <span className="order-id-badge">{getOrderRef(order)}</span>
                                            </td>
                                            <td>
                                                <strong>{order.sites?.name || 'Obra Desconhecida'}</strong>
                                            </td>
                                            <td>{order.profiles?.name || 'Admin'}</td>
                                            <td>{order.items?.length || 0} itens</td>
                                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`status-pill ${finalUiStatus}`}>
                                                    {finalUiStatus === 'new' && 'Pendente'}
                                                    {finalUiStatus === 'approved' && 'Aprovado'}
                                                    {finalUiStatus === 'denied' && 'Negado'}
                                                    {finalUiStatus === 'partial' && 'Rec. Parcial'}
                                                    {finalUiStatus === 'completed' && 'Concluído'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="table-actions-btns" onClick={e => e.stopPropagation()}>
                                                    {(finalUiStatus === 'partial' || finalUiStatus === 'completed') && (
                                                        <button className="icon-btn-pdf" style={{ color: '#f39c12' }} title="Ver Histórico Completo" onClick={(e) => { e.stopPropagation(); setHistoryOrder(order); }}>
                                                            <History size={16} />
                                                        </button>
                                                    )}

                                                    <button className="icon-btn-pdf" onClick={(e) => exportPDF(e, order)} title="Exportar PDF">
                                                        <FileDown size={16} />
                                                    </button>
                                                    <button className="icon-btn-edit hidden-mobile" onClick={(e) => { e.stopPropagation(); handleEdit(order); }} title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="icon-btn-delete" title="Excluir" onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {showModal && (
                <div className="modal-overlay glass" onClick={() => setShowModal(false)}>
                    <div className="modal-card premium-card animate-fade" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingOrder ? 'Editar Pedido' : 'Gerar Novo Pedido'}</h2>
                            <p>{editingOrder ? 'Altere os itens ou destino deste pedido.' : 'Selecione a obra destino e adicione os insumos.'}</p>
                        </div>

                        <div className="modal-form">
                            <div className="input-field">
                                <label>Obra Destino</label>
                                <select
                                    className="modal-select"
                                    value={selectedSite}
                                    onChange={e => setSelectedSite(e.target.value)}
                                >
                                    <option value="">Selecione uma obra cadastrada...</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="section-label">Itens do Pedido</label>
                            <div className="item-builder-box">
                                <div className="builder-fields">
                                    {isCustom ? (
                                        <input
                                            type="text"
                                            placeholder="Descreva o material não listado..."
                                            className="modal-input flex-1"
                                            value={currentItem.customName}
                                            onChange={e => setCurrentItem({ ...currentItem, customName: e.target.value })}
                                        />
                                    ) : (
                                        <select
                                            className="modal-select flex-1"
                                            value={currentItem.material_id}
                                            onChange={e => setCurrentItem({ ...currentItem, material_id: e.target.value })}
                                        >
                                            <option value="">Selecione um insumo do catálogo...</option>
                                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    )}
                                    <input
                                        type="number"
                                        placeholder="Qtd."
                                        className="modal-input qty-input"
                                        value={currentItem.quantity || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                                    />
                                    <button type="button" className="btn-primary btn-add-mini" onClick={addItem}>
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <button type="button" className="btn-text-muted mt-2" onClick={() => setIsCustom(!isCustom)}>
                                    {isCustom ? '← Voltar para Catálogo' : '+ Insumo não listado?'}
                                </button>
                            </div>

                            <div className="items-preview-list compact">
                                {items.length === 0 ? (
                                    <div className="empty-preview">
                                        <ClipboardList size={24} color="var(--border)" />
                                        <span>Nenhum item adicionado</span>
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div key={idx} className="preview-row">
                                            <strong>{item.name}</strong>
                                            <span className="qty-badge">{item.quantity} {item.unit || 'un'}</span>
                                            <button type="button" className="icon-btn-delete mini" onClick={() => removeItem(idx)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="modal-actions-btns">
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="button" className="btn-primary" onClick={handleSubmitOrder} disabled={loading || items.length === 0 || !selectedSite}>
                                    <Send size={18} /> {loading ? 'Sincronizando...' : (editingOrder ? 'Salvar Edição' : 'Confirmar Pedido')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewingOrder && (
                <div className="modal-overlay glass" onClick={() => setViewingOrder(null)}>
                    <div className="modal-card animate-fade" onClick={e => e.stopPropagation()} style={{ width: '600px', padding: '40px', background: '#f8f9fa', color: '#111', borderRadius: '24px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#111' }}>PEDIDO Nº {getOrderRef(viewingOrder)}</h2>
                            <p style={{ color: '#666', marginTop: '8px' }}>Obra: <strong style={{ color: '#111' }}>{viewingOrder.sites?.name || 'Desconhecida'}</strong> | Por: <strong style={{ color: '#111' }}>{viewingOrder.profiles?.name || 'Admin'}</strong></p>
                            <p style={{ color: '#888', marginTop: '4px', fontSize: '13px' }}>Data: {new Date(viewingOrder.created_at).toLocaleString('pt-BR')}</p>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', maxHeight: '45vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ color: '#888', fontSize: '11px', letterSpacing: '2px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>ITENS SOLICITADOS</h4>
                                <span style={{ fontSize: '10px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={11} color="#f39c12" />
                                    Menor preço — últimos 15 dias
                                </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>MATERIAL / INSUMO</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>UN</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', width: '55px', textAlign: 'right' }}>QTDE</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#f39c12', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right', width: '80px' }}>MENOR R$</th>
                                        <th style={{ paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', color: '#f39c12', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '12px' }}>FORNECEDOR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewingOrder.items || []).map((item: any, idx: number) => {
                                        const border = idx !== viewingOrder.items.length - 1 ? '1px solid #f0f0f0' : 'none';
                                        const hint = priceSuggestions[item.name];
                                        return (
                                            <tr key={idx}>
                                                <td style={{ padding: '11px 0', borderBottom: border, fontWeight: 600, color: '#222', fontSize: '13px' }}>{item.name}</td>
                                                <td style={{ padding: '11px 0', borderBottom: border, color: '#666', textAlign: 'center', fontSize: '13px' }}>{item.unit || 'un'}</td>
                                                <td style={{ padding: '11px 0', borderBottom: border, color: '#111', fontWeight: 900, textAlign: 'right', fontSize: '15px' }}>{item.quantity}</td>
                                                <td style={{ padding: '11px 0', borderBottom: border, textAlign: 'right', fontSize: '12px' }}>
                                                    {loadingPrices ? <span style={{ color: '#ccc' }}>...</span>
                                                        : hint ? <span style={{ fontWeight: 700, color: '#27ae60', fontFamily: 'monospace' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hint.unitValue)}</span>
                                                            : <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '11px 0 11px 12px', borderBottom: border }}>
                                                    {!loadingPrices && hint
                                                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#27ae60', whiteSpace: 'nowrap' }}><Sparkles size={10} />{hint.supplierName}</span>
                                                        : !loadingPrices ? <span style={{ color: '#ccc', fontSize: '11px' }}>Sem histórico</span>
                                                            : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <button onClick={() => { setViewingOrder(null); handleEdit(viewingOrder); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: '#eaeaea', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, transition: '0.3s' }}>
                                <Edit2 size={16} /> Alterar
                            </button>
                            <button onClick={() => { handleDelete(viewingOrder.id); setViewingOrder(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: 'none', cursor: 'pointer', fontWeight: 600, transition: '0.3s' }}>
                                <Trash2 size={16} /> Excluir
                            </button>
                            <button onClick={(e) => exportPDF(e, viewingOrder)} style={{ background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 800, transition: '0.3s', boxShadow: '0 4px 12px rgba(255,215,0,0.3)' }}>
                                <FileDown size={18} /> Gerar PDF
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', paddingTop: '24px', borderTop: '1px solid #ddd' }}>
                            {viewingOrder.status === 'approved' && (
                                <>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'new'); setViewingOrder({ ...viewingOrder, status: 'new' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#FF9500', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>Pendente</button>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'denied'); setViewingOrder({ ...viewingOrder, status: 'denied' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#FF3B30', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><XCircle size={18} /> Negar</button>
                                </>
                            )}
                            {(viewingOrder.status === 'new' || viewingOrder.status === 'pending') && (
                                <>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'approved'); setViewingOrder({ ...viewingOrder, status: 'approved' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#34C759', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><CheckCircle size={18} /> Aprovar</button>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'denied'); setViewingOrder({ ...viewingOrder, status: 'denied' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#FF3B30', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><XCircle size={18} /> Negar</button>
                                </>
                            )}
                            {viewingOrder.status === 'denied' && (
                                <>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'approved'); setViewingOrder({ ...viewingOrder, status: 'approved' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#34C759', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><CheckCircle size={18} /> Aprovar</button>
                                    <button onClick={() => { updateStatus(viewingOrder.id, 'new'); setViewingOrder({ ...viewingOrder, status: 'new' }); }} style={{ padding: '12px 24px', borderRadius: '12px', background: '#FF9500', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>Pendente</button>
                                </>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '30px' }}>
                            <button onClick={() => setViewingOrder(null)} style={{ border: '1px solid #ccc', background: 'transparent', color: '#555', cursor: 'pointer', fontWeight: 600, transition: '0.3s', width: '100%', padding: '14px', borderRadius: '12px' }}>Sair da Visualização</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .admin-orders-view { display: flex; flex-direction: column; gap: 40px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; }
        .header-actions { display: flex; gap: 16px; align-items: center; }
        .search-bar-glass {
           background: rgba(255,255,255,0.03); border: 1px solid var(--border);
           border-radius: 12px; padding: 0 16px; display: flex; align-items: center; gap: 12px; width: 300px;
           height: 48px;
        }
        .search-bar-glass input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 14px; }
        
        .premium-table-wrapper { background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border); overflow: hidden; }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
        .modern-table th { padding: 14px 16px; font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        
        .order-id-badge { font-family: monospace; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; color: var(--text-secondary); }
        
        .status-pill { padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
        .status-pill.new { background: rgba(255,215,0,0.1); color: var(--primary); border: 1px solid rgba(255,215,0,0.2); }
        .status-pill.approved { background: rgba(52,199,89,0.1); color: #34C759; border: 1px solid rgba(52,199,89,0.2); }
        .status-pill.denied { background: rgba(255,59,48,0.1); color: #FF3B30; border: 1px solid rgba(255,59,48,0.2); }
        .status-pill.partial { background: rgba(243,156,18,0.1); color: #f39c12; border: 1px solid rgba(243,156,18,0.2); }
        .status-pill.completed { background: rgba(39,174,96,0.1); color: #27ae60; border: 1px solid rgba(39,174,96,0.2); }

        .table-actions-btns { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .clickable-row { cursor: pointer; transition: 0.3s; }
        .clickable-row:hover { background: rgba(255,255,255,0.02); }

        .icon-btn-pdf { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;}
        .icon-btn-pdf:hover { background: rgba(255,215,0,0.1); color: var(--primary); border-color: rgba(255,215,0,0.2); }
        .icon-btn-edit { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;}
        .icon-btn-edit:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }
        .icon-btn-delete { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;}
        .icon-btn-delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }

        .modal-card { width: 500px; padding: 48px; border-radius: 32px; }
        .input-field { margin-bottom: 24px; }
        .input-field label, .section-label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .modal-select { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: white; outline: none; appearance: none; }
        
        .item-builder-box { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
        .builder-fields { display: flex; gap: 12px; align-items: stretch; }
        .modal-input { padding: 12px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; color: white; outline: none; }
        .flex-1 { flex: 1; min-width: 0; }
        .qty-input { width: 80px; text-align: center; }
        .btn-add-mini { padding: 0 16px; border-radius: 10px; }
        
        .btn-text-muted { background: none; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer; transition: 0.2s; padding: 0; }
        .btn-text-muted:hover { color: white; }
        .mt-2 { margin-top: 12px; display: block; }
        
        .items-preview-list.compact { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 16px; padding: 8px; max-height: 200px; overflow-y: auto; margin-bottom: 24px;}
        .preview-row { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px dashed var(--border); gap: 12px;}
        .preview-row:last-child { border-bottom: none; }
        .preview-row strong { flex: 1; font-size: 13px; font-weight: 500;}
        .qty-badge { background: rgba(255,215,0,0.1); color: var(--primary); padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;}
        .icon-btn-delete.mini { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .icon-btn-delete.mini:hover { color: #FF3B30; }

        .empty-preview { padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); font-size: 13px; }
        .modal-actions-btns { display: flex; justify-content: flex-end; gap: 16px; margin-top: 16px; }

        @media (max-width: 768px) {
          .view-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .header-actions { flex-wrap: wrap; gap: 8px; }
          .page-title { font-size: 22px; }
          .premium-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
          .modern-table { min-width: 580px; }
          .modal-card { width: 92vw; padding: 20px; border-radius: 20px; max-height: 90vh; overflow-y: auto; }
          .builder-fields { flex-wrap: wrap; }
          .qty-input { width: 100%; }
        }
      `}</style>
        </div>
    );
};

export default AdminOrders;
