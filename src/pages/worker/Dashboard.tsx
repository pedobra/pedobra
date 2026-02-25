import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Package,
    History,
    LogOut,
    Construction,
    ChevronRight,
    FileText,
    Send,
    Trash2,
    MapPin,
    Archive,
    Search,
    MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateOrderPDF } from '../../lib/generateOrderPDF';
import ThemeToggle from '../../components/ThemeToggle';

const MATERIAL_CATEGORIES = [
    'Estrutural',
    'Elétrica',
    'Hidráulica',
    'Acabamento',
    'Outros'
];

const MATERIAL_UNITS = [
    { value: 'un', label: 'un (Unidade)' },
    { value: 'kg', label: 'kg (Quilograma)' },
    { value: 't', label: 't (Tonelada)' },
    { value: 'g', label: 'g (Grama)' },
    { value: 'm', label: 'm (Metro Linear)' },
    { value: 'm²', label: 'm² (Metro Quadrado)' },
    { value: 'm³', label: 'm³ (Metro Cúbico)' },
    { value: 'L', label: 'L (Litro)' },
    { value: 'ml', label: 'ml (Mililitro)' },
    { value: 'cx', label: 'cx (Caixa)' },
    { value: 'saco', label: 'saco (Saco)' },
    { value: 'lata', label: 'lata (Lata)' },
    { value: 'galão', label: 'galão (Galão)' },
    { value: 'rolo', label: 'rolo (Rolo)' },
    { value: 'cj', label: 'cj (Conjunto)' },
    { value: 'par', label: 'par (Par)' }
];

const WorkerDashboard = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState({
        material_id: '',
        quantity: 0,
        customName: '',
        category: 'Outros',
        unit: 'un'
    });
    const [isCustom, setIsCustom] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [observations, setObservations] = useState('');

    const getOrderRef = (order: any) => {
        if (!order || !order.created_at) return 'N/A';
        const d = new Date(order.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const seq = String(order.seq_number || 0).padStart(4, '0');
        return `${dd}${mm}_${seq}`;
    };

    useEffect(() => {
        fetchOrders();
        fetchMaterials();
    }, [profile]);

    const fetchOrders = async () => {
        if (!profile) return;
        const { data } = await supabase
            .from('orders')
            .select('*, sites(name, address)')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*');
        if (data) setMaterials(data);
    };

    const addItem = async () => {
        if (isCustom) {
            if (!currentItem.customName) {
                alert('Por favor, descreva o material desejado.');
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
            // Check for duplicates first
            const duplicate = materials.find(m => m.name.toLowerCase().trim() === currentItem.customName.toLowerCase().trim());

            if (duplicate) {
                const useExisting = window.confirm(`O insumo "${duplicate.name}" já existe no catálogo. Deseja utilizá-lo ao invés de criar um novo?`);
                if (useExisting) {
                    const existingInList = items.find(i => i.material_id === duplicate.id);
                    if (existingInList) {
                        setItems(items.map(i =>
                            i.material_id === duplicate.id
                                ? { ...i, quantity: i.quantity + currentItem.quantity }
                                : i
                        ));
                    } else {
                        setItems([...items, { material_id: duplicate.id, quantity: currentItem.quantity, name: duplicate.name, unit: duplicate.unit }]);
                    }
                    setCurrentItem({ material_id: '', quantity: 0, customName: '', category: 'Outros', unit: 'un' });
                    setIsCustom(false);
                    return;
                }
                return;
            }

            const confirmNew = window.confirm(`Deseja cadastrar o novo insumo "${currentItem.customName}"?`);
            if (!confirmNew) return;

            setLoading(true);
            const { data: newMat, error } = await supabase.from('materials').insert({
                name: currentItem.customName,
                unit: currentItem.unit,
                category: currentItem.category
            }).select().single();
            setLoading(false);

            if (error || !newMat) {
                alert('Erro ao cadastrar novo insumo.');
                return;
            }

            setMaterials([...materials, newMat]);
            setItems([...items, {
                material_id: newMat.id,
                quantity: currentItem.quantity,
                name: newMat.name,
                unit: newMat.unit
            }]);
            setCurrentItem({ material_id: '', quantity: 0, customName: '', category: 'Outros', unit: 'un' });
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
            setCurrentItem({ material_id: '', quantity: 0, customName: '', category: 'Outros', unit: 'un' });
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmitOrder = async () => {
        if (items.length === 0) return;

        const confirmResult = window.confirm(`Deseja transmitir este pedido com ${items.length} itens?`);
        if (!confirmResult) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('orders').insert({
                site_id: profile.site_id,
                user_id: profile.id,
                items: items,
                observations: observations,
                status: 'new'
            });

            if (error) throw error;

            setShowModal(false);
            setItems([]);
            setObservations('');
            fetchOrders();
            alert('Pedido enviado com sucesso para análise admin.');
        } catch (err: any) {
            alert('Erro ao enviar pedido: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const exportPDF = (order: any) => {
        generateOrderPDF(order, profile.name);
    };

    return (
        <div className="worker-app">
            <header className="app-header glass">
                <div className="worker-meta">
                    <div className="app-logo">
                        <Construction size={22} color="var(--bg-dark)" />
                    </div>
                    <div className="worker-text">
                        <strong>{profile.name}</strong>
                        <span>{profile.sites?.name || 'Administração'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ThemeToggle />
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="app-content animate-fade">
                <div className="action-hub">
                    <h1 className="welcome-title">Operações de Campo</h1>
                    <p className="welcome-desc">Gerencie seus pedidos e acompanhe o status em tempo real.</p>

                    <button className="btn-hero-action" onClick={() => setShowModal(true)}>
                        <div className="btn-icon-box"><Plus size={24} /></div>
                        <div className="btn-label-box">
                            <strong>Novo Pedido de Insumo</strong>
                            <span>Clique para abrir formulário</span>
                        </div>
                        <ChevronRight size={20} className="ml-auto" />
                    </button>

                    <button className="btn-hero-action" onClick={() => navigate('/dashboard/receipts')} style={{ marginTop: '16px' }}>
                        <div className="btn-icon-box" style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--status-approved)' }}><Archive size={24} /></div>
                        <div className="btn-label-box">
                            <strong>Recebimento de Pedidos</strong>
                            <span>Registre entregas e materiais</span>
                        </div>
                        <ChevronRight size={20} className="ml-auto" />
                    </button>
                </div>

                <div className="mobile-fab-container">
                    <button className="btn-primary fab" onClick={() => setShowModal(true)}>
                        <Plus size={24} />
                    </button>
                </div>

                <section className="history-section">
                    <div className="search-bar-worker" style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '12px', height: '48px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar pedido por número (REF)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '15px' }}
                        />
                    </div>

                    <div className="section-title-row">
                        <div className="title-with-icon">
                            <History size={18} color="var(--primary)" />
                            <h2>Histórico Recente</h2>
                        </div>
                        <span className="count-badge">{orders.length}</span>
                    </div>

                    <div className="order-list">
                        {orders.filter(o => getOrderRef(o).toLowerCase().includes(searchTerm.toLowerCase())).map(order => {
                            const childOrder = order.status === 'partial' ? orders.find(o => o.items?.some((i: any) => i.name?.includes(`[COMPLEMENTO REF ${getOrderRef(order)}]`))) : null;
                            const isRealCompleted = order.status === 'completed' || (order.status === 'partial' && childOrder?.status === 'completed');
                            const finalUiStatus = isRealCompleted ? 'completed' : order.status;

                            return (
                                <div key={order.id} className="order-card-compact premium-card" onClick={() => setViewingOrder(order)} style={{ cursor: 'pointer' }}>
                                    <div className="order-main">
                                        <div className="order-info">
                                            <span className="order-id">REF: {getOrderRef(order)}</span>
                                            <div className="item-count">
                                                <Package size={14} />
                                                <span>{order.items.length} itens solicitados</span>
                                            </div>
                                        </div>
                                        <span className={`status-pill ${finalUiStatus}`}>
                                            {finalUiStatus === 'new' && 'Pendente'}
                                            {finalUiStatus === 'approved' && 'Aprovado'}
                                            {finalUiStatus === 'denied' && 'Negado'}
                                            {finalUiStatus === 'partial' && 'Rec. Parcial'}
                                            {finalUiStatus === 'completed' && 'Concluído'}
                                        </span>
                                    </div>
                                    <div className="order-footer">
                                        <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                                        <button className="btn-text-action" onClick={(e) => { e.stopPropagation(); exportPDF(order); }}>
                                            <FileText size={16} /> Ver PDF
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </main>

            {showModal && (
                <div className="modal-overlay-mobile glass" onClick={() => setShowModal(false)}>
                    <div className="mobile-sheet premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="sheet-handle"></div>
                        <div className="sheet-header">
                            <h2>Nova Requisição</h2>
                            <p>Selecione os materiais e quantidades necessárias para sua frente de trabalho.</p>
                        </div>
                        <div className="item-builder">
                            <div className="builder-fields">
                                <div className="read-only-site-box" style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <MapPin size={16} color="var(--primary)" />
                                    <span><strong>Obra:</strong> {profile.sites?.name || 'Administração'}</span>
                                </div>
                            </div>
                            <div className="builder-fields">
                                {isCustom ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                        <input
                                            type="text"
                                            placeholder="Nome do novo Insumo..."
                                            value={currentItem.customName}
                                            onChange={e => setCurrentItem({ ...currentItem, customName: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <select
                                                value={currentItem.category}
                                                onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })}
                                            >
                                                <option value="">Categoria...</option>
                                                {MATERIAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <select
                                                value={currentItem.unit}
                                                onChange={e => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                            >
                                                <option value="">Unidade...</option>
                                                {MATERIAL_UNITS.map(un => <option key={un.value} value={un.value}>{un.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                        <select
                                            value={selectedCategory}
                                            onChange={e => {
                                                setSelectedCategory(e.target.value);
                                                setCurrentItem({ ...currentItem, material_id: '' });
                                            }}
                                            style={{ border: '1px solid var(--primary)', background: 'var(--primary-glow)' }}
                                        >
                                            <option value="">Filtrar por Categoria...</option>
                                            {MATERIAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>

                                        <select
                                            value={currentItem.material_id}
                                            onChange={e => setCurrentItem({ ...currentItem, material_id: e.target.value })}
                                        >
                                            <option value="">Selecione o Insumo...</option>
                                            {materials
                                                .filter(m => !selectedCategory || m.category === selectedCategory)
                                                .map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                                <div className="builder-row-sm">
                                    <input
                                        type="number"
                                        placeholder="Qtd."
                                        className="qty-input"
                                        value={currentItem.quantity || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                                    />
                                    <button className="btn-add-item" onClick={addItem}>
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <button className="toggle-custom-btn" onClick={() => setIsCustom(!isCustom)}>
                                {isCustom ? '← Voltar para Catálogo' : '+ Não encontrou? Cadastrar Insumo Avulso'}
                            </button>
                        </div>

                        <div className="items-preview-list">
                            {items.length === 0 ? (
                                <div className="empty-preview">
                                    <Package size={32} color="var(--border)" />
                                    <span>Lista de itens vazia</span>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={idx} className="preview-row">
                                        <strong>{item.name}</strong>
                                        <span>{item.quantity} {item.unit || 'un'}</span>
                                        <button className="del-btn" onClick={() => removeItem(idx)}><Trash2 size={16} /></button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '13px' }}>
                                <MessageSquare size={14} color="var(--text-muted)" />
                                <strong>Observações</strong>
                            </div>
                            <textarea
                                placeholder="Adicione observações para este pedido (opcional)..."
                                value={observations}
                                onChange={e => setObservations(e.target.value)}
                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: '80px', fontSize: '14px' }}
                            />
                        </div>

                        <div className="sheet-footer">
                            <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSubmitOrder} disabled={loading || items.length === 0}>
                                <Send size={18} /> {loading ? 'Enviando...' : 'Transmitir Pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingOrder && (() => {
                const childOrder = viewingOrder.status === 'partial' ? orders.find(o => o.items?.some((i: any) => i.name?.includes(`[COMPLEMENTO REF ${getOrderRef(viewingOrder)}]`))) : null;
                const isRealCompleted = viewingOrder.status === 'completed' || (viewingOrder.status === 'partial' && childOrder?.status === 'completed');
                const finalUiStatus = isRealCompleted ? 'completed' : viewingOrder.status;

                return (
                    <div className="modal-overlay-mobile glass" onClick={() => setViewingOrder(null)}>
                        <div className="mobile-sheet premium-card animate-fade" onClick={e => e.stopPropagation()}>
                            <div className="sheet-handle"></div>
                            <div className="sheet-header" style={{ marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Pedido #{getOrderRef(viewingOrder)}</h2>
                                <p style={{ marginTop: '8px' }}>
                                    <span className={`status-pill ${finalUiStatus}`}>
                                        {finalUiStatus === 'new' ? 'Pendente' : finalUiStatus === 'approved' ? 'Aprovado' : finalUiStatus === 'partial' ? 'Rec. Parcial' : finalUiStatus === 'completed' ? 'Concluído' : 'Negado'}
                                    </span>
                                </p>
                            </div>
                            {viewingOrder.observations && (
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Observações:</span>
                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{viewingOrder.observations}</p>
                                </div>
                            )}
                            <div className="items-preview-list" style={{ flex: 1, minHeight: '120px' }}>
                                {viewingOrder.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="preview-row" style={{ borderBottom: '1px dashed var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '15px' }}>{item.name}</span>
                                        <strong style={{ color: 'var(--primary)' }}>{item.quantity} {item.unit || 'un'}</strong>
                                    </div>
                                ))}
                            </div>
                            <div className="sheet-footer" style={{ marginTop: '24px' }}>
                                <button className="btn-ghost" onClick={() => setViewingOrder(null)}>Fechar</button>
                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); exportPDF(viewingOrder); }}>
                                    <FileText size={18} /> Ver PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            <style>{`
        .worker-app {
          min-height: 100vh; background: var(--bg-dark); color: var(--text-primary);
          padding-top: 80px; padding-bottom: 40px;
        }
        .app-header {
          position: fixed; top: 0; left: 0; right: 0; height: 72px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; z-index: 100; border-bottom: 1px solid var(--border);
        }
        .worker-meta { display: flex; align-items: center; gap: 12px; }
        .app-logo { background: var(--primary); padding: 6px; border-radius: 8px; }
        .worker-text { display: flex; flex-direction: column; }
        .worker-text strong { font-size: 14px; }
        .worker-text span { font-size: 11px; color: var(--text-muted); }
        .logout-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }

        .app-content { max-width: 600px; margin: 0 auto; padding: 0 24px; }
        .action-hub { margin-bottom: 48px; }
        .welcome-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .welcome-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }
        
        .btn-hero-action {
          width: 100%; background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 16px;
          text-align: left; transition: 0.3s; color: var(--text-primary); cursor: pointer;
        }
        .btn-hero-action:hover { border-color: var(--primary); transform: translateY(-4px); }
        .btn-icon-box { width: 52px; height: 52px; background: var(--primary-glow); color: var(--primary); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .btn-label-box { display: flex; flex-direction: column; }
        .btn-label-box strong { font-size: 16px; margin-bottom: 2px; }
        .btn-label-box span { font-size: 12px; color: var(--text-muted); }
        .ml-auto { margin-left: auto; color: var(--text-muted); }

        .section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .title-with-icon { display: flex; align-items: center; gap: 10px; }
        .title-with-icon h2 { font-size: 18px; font-weight: 700; color: var(--text-secondary); }
        .count-badge { background: var(--bg-card); color: var(--text-muted); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid var(--border); }

        .order-list { display: flex; flex-direction: column; gap: 16px; }
        .order-card-compact { padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px; }
        .order-main { display: flex; justify-content: space-between; align-items: center; }
        .order-info { display: flex; flex-direction: column; gap: 4px; }
        .order-id { font-family: monospace; font-size: 13px; color: var(--primary); }
        .item-count { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 13px; }
        
        .status-pill { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .status-pill.new      { background: rgba(255,215,0,0.1);   color: var(--primary);          border: 1px solid rgba(255,215,0,0.2); }
        .status-pill.approved { background: rgba(52,199,89,0.1);   color: #34C759;                 border: 1px solid rgba(52,199,89,0.2); }
        .status-pill.denied   { background: rgba(255,59,48,0.1);   color: #FF3B30;                 border: 1px solid rgba(255,59,48,0.2); }
        .status-pill.partial  { background: rgba(243,156,18,0.1);  color: #f39c12;                 border: 1px solid rgba(243,156,18,0.2); }
        .status-pill.completed{ background: rgba(39,174,96,0.1);   color: #27ae60;                 border: 1px solid rgba(39,174,96,0.2); }

        .order-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); margin-top: 4px; padding-top: 12px;}
        .order-date { font-size: 12px; color: var(--text-muted); }
        .btn-text-action { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text-primary); font-size: 12px; font-weight: 700; cursor: pointer;}

        /* Mobile Sheet Styling */
        .modal-overlay-mobile { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; }
        .mobile-sheet { width: 100%; border-radius: 32px 32px 0 0; padding: 32px; padding-top: 12px; max-height: 90vh; overflow-y: auto; }
        .sheet-handle { width: 40px; height: 4px; background: var(--border); border-radius: 2px; margin: 0 auto 24px; }
        .sheet-header { margin-bottom: 32px; }
        .sheet-header h2 { font-size: 22px; font-weight: 800; }
        .sheet-header p { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

        .item-builder { margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px; }
        .builder-fields { display: flex; gap: 12px; }
        .builder-fields select, .builder-fields input[type="text"] { flex: 1; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); padding: 12px; outline: none; }
        .builder-row-sm { display: flex; gap: 10px; }
        .qty-input { width: 80px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); padding: 12px; text-align: center; outline: none; }
        .btn-add-item { background: var(--primary); color: var(--bg-card); border: none; padding: 12px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 48px;}
        .toggle-custom-btn { background: transparent; border: none; color: var(--primary); font-size: 12px; font-weight: 700; cursor: pointer; align-self: flex-start; padding: 4px 0; }

        .items-preview-list { margin-bottom: 40px; background: rgba(255,255,255,0.02); border-radius: 20px; padding: 8px; border: 1px solid var(--border); }
        .preview-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 12px; }
        .preview-row:last-child { border-bottom: none; }
        .preview-row strong { flex: 1; font-size: 14px; }
        .preview-row span { color: var(--primary); font-family: monospace; font-size: 14px; }
        .del-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
        .empty-preview { padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); font-size: 14px; }

        .sheet-footer { display: flex; gap: 16px; }
        .sheet-footer .btn-ghost { flex: 1; }
        .sheet-footer .btn-primary { flex: 2; }

        .mobile-fab-container { display: none; }
        @media (max-width: 768px) {
           .mobile-fab-container {
              display: block; position: fixed; bottom: 32px; right: 24px; z-index: 100;
           }
           .fab {
              width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 8px 24px var(--primary-glow); display: flex; align-items: center; justify-content: center;
           }
        }
      `}</style>
        </div >
    );
};

export default WorkerDashboard;
