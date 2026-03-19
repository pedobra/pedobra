import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, MapPin, Search, Building2, LayoutGrid, List, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import StatusBadge from '../../components/ui/StatusBadge';


const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const AdminObras = () => {
    const navigate = useNavigate();
    const [obras, setObras] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchObras();
    }, []);

    const fetchObras = async () => {
        const { data: sitesData } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
        const { data: ordersData } = await supabase
            .from('orders')
            .select('site_id, status, items');

        if (sitesData) {
            const enriched = sitesData.map(site => {
                const siteOrders = ordersData?.filter(o => o.site_id === site.id) || [];
                const orderCount = siteOrders.length;

                // Valor gasto: soma de (received_quantity * unit_value) nos pedidos recebidos
                let usedValue = 0;
                siteOrders
                    .filter(o => o.status === 'completed' || o.status === 'partial')
                    .forEach(o => {
                        (o.items || []).forEach((item: any) => {
                            const qty = parseFloat(item.received_quantity) || 0;
                            const price = parseFloat(item.unit_value) || 0;
                            usedValue += qty * price;
                        });
                    });

                const budget = site.settings?.budget_planned || 0;
                return { ...site, orderCount, usedValue, budget };
            });
            setObras(enriched);
        }
    };

    const handleCEPLookup = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, cep: cleanCEP }));

        if (cleanCEP.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
                    }));
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
            }
        }
    };

    const handleEdit = (obra: any) => {
        navigate(`/admin/obras/editar/${obra.id}`);
    };

    const filteredObras = obras.filter(o =>
        (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.address?.full || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="obras-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Gestão de Canteiros</h1>
                    <p className="page-subtitle">Acompanhe o status físico e financeiro de suas obras ativas.</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle-glass">
                        <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                            <List size={18} />
                        </button>
                        <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder="Pesquisar obra..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/admin/obras/novo')}>
                        <Plus size={20} /> Nova Obra
                    </button>
                </div>
            </header>

            <StandardCard
                title="Gestão de Canteiros"
                subtitle="Acompanhe o status físico e financeiro de suas obras ativas."
                actions={
                    <button className="btn-primary" onClick={() => navigate('/admin/obras/novo')}>
                        <Plus size={20} /> Nova Obra
                    </button>
                }
            >
                {viewMode === 'table' ? (
                    <ModernTable headers={['Nome da Obra', 'Pedidos', 'Orçamento', 'Ações']}>
                        {filteredObras.map(obra => (
                            <tr key={obra.id} className="clickable-row" onClick={() => handleEdit(obra)}>
                                <td>
                                    <div className="obra-identity">
                                        <div className="obra-icon-mini"><Building2 size={14} /></div>
                                        <div className="obra-texts">
                                            <strong>{obra.name}</strong>
                                            <span className="text-muted-xs">{obra.address?.full}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <StatusBadge status={obra.orderCount > 0 ? 'active' : 'pending'} label={`${obra.orderCount} Pedidos`} />
                                </td>
                                <td>
                                    <div className="budget-stack">
                                        <span className="money-main">{fmtBRL(obra.budget)}</span>
                                        <span className="money-sub">Usado: {fmtBRL(obra.usedValue)}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="table-actions-btns" onClick={e => e.stopPropagation()}>
                                        <button className="icon-btn-edit" onClick={() => handleEdit(obra)} title="Editar"><Edit2 size={16} /></button>
                                        <button className="icon-btn-delete" onClick={async () => {
                                            if (confirm('Remover canteiro?')) {
                                                await supabase.from('sites').delete().eq('id', obra.id);
                                                fetchObras();
                                            }
                                        }} title="Remover"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </ModernTable>
                ) : (
                    <div className="obras-grid-reduced">
                        {filteredObras.map(obra => (
                            <div key={obra.id} className="obra-card-small clickable-card" onClick={() => handleEdit(obra)}>
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
                                    <span>{obra.address?.full || 'Não informado'}</span>
                                </div>
                                <div className="card-budget-info">
                                    <label>ORÇAMENTO</label>
                                    <strong>{fmtBRL(obra.budget)}</strong>
                                </div>
                            </div>
                        ))}
                        <div className="add-obra-card-small" onClick={() => navigate('/admin/obras/novo')}>
                            <Plus size={24} />
                            <span>Adicionar Obra</span>
                        </div>
                    </div>
                )}
            </StandardCard>

            <style>{`
        .obras-view { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.3s ease-out; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; }
        .page-subtitle { color: var(--text-muted); font-size: 14px; }
        
        .header-actions { display: flex; gap: 12px; align-items: center; }
        .view-toggle-glass { 
            background: var(--bg-dark); border: 1px solid var(--border); 
            border-radius: 12px; display: flex; padding: 4px; gap: 4px;
        }
        .view-toggle-glass button {
            background: transparent; border: none; color: var(--text-muted); 
            width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .view-toggle-glass button.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

        .search-bar-glass {
           background: var(--bg-dark); border: 1px solid var(--border);
           border-radius: 12px; padding: 0 16px; display: flex; align-items: center; gap: 10px; width: 260px;
           height: 42px;
        }
        .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 13px; }

        .obra-identity { display: flex; align-items: center; gap: 14px; }
        .obra-icon-mini { width: 36px; height: 36px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .obra-texts { display: flex; flex-direction: column; }
        .text-muted-xs { font-size: 11px; color: var(--text-muted); }

        .budget-stack { display: flex; flex-direction: column; }
        .money-main { font-size: 14px; font-weight: 700; color: var(--text-primary); }
        .money-sub { font-size: 11px; color: var(--text-muted); }

        .obras-grid-reduced { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .obra-card-small { 
            padding: 24px; border-radius: 20px; border: 1px solid var(--border); 
            transition: 0.3s; background: var(--bg-card); display: flex; flex-direction: column; gap: 16px;
        }
        .clickable-card { cursor: pointer; }
        .obra-card-small:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: var(--shadow-premium); }
        
        .obra-card-small h3 { font-size: 18px; margin: 0; font-weight: 700; }
        .card-address { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px; }
        .card-address span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .card-budget-info { border-top: 1px solid var(--border); pt: 16px; display: flex; flex-direction: column; gap: 4px; }
        .card-budget-info label { font-size: 10px; font-weight: 700; color: var(--text-muted); }
        .card-budget-info strong { font-size: 15px; }

        .add-obra-card-small { border: 2px dashed var(--border); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; color: var(--text-muted); min-height: 180px; }
        .add-obra-card-small:hover { border-color: var(--primary); color: var(--primary); background: var(--bg-dark); }

        .modal-card { width: 500px; padding: 48px; border-radius: 32px; }
        .modal-actions-btns { display: flex; justify-content: flex-end; gap: 16px; margin-top: 32px; }
        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .input-field input { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); outline: none; }
        .form-row-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        @media (max-width: 768px) {
          .view-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .header-actions { flex-wrap: wrap; gap: 8px; }
          .page-title { font-size: 22px; }
          .premium-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
          .modern-table { min-width: 600px; }
          .obras-grid-reduced { grid-template-columns: repeat(2, 1fr); }
          .modal-card { width: 92vw; padding: 24px; }
          .form-row-dual { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

export default AdminObras;
