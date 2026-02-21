import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, MapPin, Search, Building2, LayoutGrid, List, Edit2, Trash2 } from 'lucide-react';


const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const AdminObras = () => {
    const [obras, setObras] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [showModal, setShowModal] = useState(false);
    const [editingObra, setEditingObra] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', cep: '', address: '', budget: '' });
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

    const handleOpenCreate = () => {
        setEditingObra(null);
        setFormData({ name: '', cep: '', address: '', budget: '' });
        setShowModal(true);
    };

    const handleEdit = (obra: any) => {
        setEditingObra(obra);
        setFormData({
            name: obra.name,
            cep: obra.address?.cep || '',
            address: obra.address?.full || '',
            budget: obra.settings?.budget_planned?.toString() || '0'
        });
        setShowModal(true);
    };

    const handleDeleteObra = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este canteiro?')) return;

        setLoading(true);
        const { error } = await supabase.from('sites').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchObras();
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            name: formData.name,
            address: {
                full: formData.address,
                cep: formData.cep
            },
            settings: {
                budget_planned: parseFloat(formData.budget) || 0
            }
        };

        const { error } = editingObra
            ? await supabase.from('sites').update(payload).eq('id', editingObra.id)
            : await supabase.from('sites').insert(payload);

        if (error) alert(error.message);
        else {
            setShowModal(false);
            fetchObras();
            setFormData({ name: '', cep: '', address: '', budget: '' });
            setEditingObra(null);
        }
        setLoading(false);
    };

    return (
        <div className="obras-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">Canteiros de Obras</h1>
                    <p className="page-subtitle">Gestão centralizada de infraestrutura e logística operacional.</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle-glass">
                        <button
                            className={viewMode === 'table' ? 'active' : ''}
                            onClick={() => setViewMode('table')}
                            title="Visualização em Lista"
                        >
                            <List size={18} />
                        </button>
                        <button
                            className={viewMode === 'cards' ? 'active' : ''}
                            onClick={() => setViewMode('cards')}
                            title="Visualização em Cards"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <div className="search-bar-glass">
                        <Search size={18} color="var(--text-muted)" />
                        <input type="text" placeholder="Localizar canteiro..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <Plus size={20} /> Nova Obra
                    </button>
                </div>
            </header>

            {viewMode === 'table' ? (
                <div className="premium-table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>NOME DA OBRA</th>
                                <th style={{ textAlign: 'center' }}>PEDIDOS</th>
                                <th style={{ textAlign: 'right' }}>ORÇAMENTO</th>
                                <th style={{ textAlign: 'right' }}>VALOR USADO</th>
                                <th style={{ textAlign: 'right' }}>SALDO</th>
                                <th style={{ textAlign: 'right' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {obras.filter(o =>
                                (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (o.address?.full || '').toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(obra => (
                                <tr key={obra.id} className={`clickable-row ${obra.budget > 0 ? (obra.usedValue / obra.budget >= 0.9 ? 'row-alert-red' : obra.usedValue / obra.budget >= 0.5 ? 'row-alert-yellow' : '') : ''}`} onClick={() => handleEdit(obra)}>
                                    <td>
                                        <div className="obra-identity">
                                            <div className="obra-icon-mini"><Building2 size={14} /></div>
                                            <strong>{obra.name}</strong>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="count-badge">{obra.orderCount}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="money-value">{fmtBRL(obra.budget)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="money-value used">{fmtBRL(obra.usedValue)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {(() => {
                                            const diff = (obra.budget || 0) - (obra.usedValue || 0);
                                            return <span className={`money-value ${diff >= 0 ? 'positive' : 'negative'}`}>{fmtBRL(diff)}</span>;
                                        })()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="table-actions-btns" onClick={e => e.stopPropagation()}>
                                            <button className="icon-btn-edit" onClick={() => handleEdit(obra)} title="Editar"><Edit2 size={16} /></button>
                                            <button className="icon-btn-delete" onClick={() => handleDeleteObra(obra.id)} title="Remover"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="obras-grid-reduced">
                    {obras.filter(o =>
                        (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (o.address?.full || '').toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(obra => (
                        <div key={obra.id} className="obra-card-small glass clickable-card" onClick={() => handleEdit(obra)}>
                            <div className="card-top">
                                <h3>{obra.name}</h3>
                                <div className="card-actions-mini" onClick={e => e.stopPropagation()}>
                                    <button className="card-icon-action" onClick={() => handleEdit(obra)}><Edit2 size={14} /></button>
                                    <button className="card-icon-action delete" onClick={() => handleDeleteObra(obra.id)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div className="card-mid">
                                <span className="order-pill">{obra.orderCount} Pedidos</span>
                            </div>
                            <div className="card-address">
                                <MapPin size={12} color="var(--primary)" />
                                <span>{obra.address?.full || 'Não informado'}</span>
                            </div>
                            <button className="btn-card-enter">
                                Acessar Canteiro
                            </button>
                        </div>
                    ))}
                    <div className="add-obra-card-small" onClick={handleOpenCreate}>
                        <Plus size={24} />
                        <span>Nova Obra</span>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay glass" onClick={() => setShowModal(false)}>
                    <div className="modal-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingObra ? 'Alterar Canteiro' : 'Cadastrar Nova Obra'}</h2>
                            <p>{editingObra ? 'Atualize as informações técnicas da unidade.' : 'Insira os detalhes técnicos da nova unidade.'}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="input-field">
                                <label>Nome do Canteiro</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Residencial Diamond" required />
                            </div>

                            <div className="form-row-dual">
                                <div className="input-field">
                                    <label>Busca por CEP</label>
                                    <input
                                        type="text"
                                        value={formData.cep}
                                        onChange={e => handleCEPLookup(e.target.value)}
                                        placeholder="00000-000"
                                        maxLength={9}
                                        required
                                    />
                                </div>
                                <div className="input-field">
                                    <label>Orçamento Previsto (R$)</label>
                                    <input
                                        type="number"
                                        value={formData.budget}
                                        onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                        placeholder="150000.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-field">
                                <label>Endereço Completo</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Rua, Número, Bairro, Cidade"
                                    required
                                />
                            </div>

                            <div className="modal-actions-btns">
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Sincronizando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .obras-view { display: flex; flex-direction: column; gap: 40px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text-secondary); font-size: 14px; }
        
        .header-actions { display: flex; gap: 16px; align-items: center; }
        .view-toggle-glass { 
            background: rgba(255,255,255,0.03); border: 1px solid var(--border); 
            border-radius: 12px; display: flex; padding: 4px; gap: 4px;
        }
        .view-toggle-glass button {
            background: transparent; border: none; color: var(--text-muted); 
            width: 38px; height: 38px; border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: 0.3s;
        }
        .view-toggle-glass button.active { background: var(--border); color: var(--primary); }

        .search-bar-glass {
           background: rgba(255,255,255,0.03); border: 1px solid var(--border);
           border-radius: 12px; padding: 0 16px; display: flex; align-items: center; gap: 12px; width: 300px;
           height: 48px;
        }
        .search-bar-glass input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 14px; }

        .premium-table-wrapper { background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border); overflow: hidden; }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
        .modern-table th { padding: 20px 24px; font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 18px 24px; font-size: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .modern-table tr:hover { background: rgba(255,255,255,0.015); }
        .row-alert-yellow { background: rgba(255, 215, 0, 0.06) !important; border-left: 3px solid rgba(255,215,0,0.5); }
        .row-alert-yellow:hover { background: rgba(255, 215, 0, 0.1) !important; }
        .row-alert-red { background: rgba(255, 59, 48, 0.07) !important; border-left: 3px solid rgba(255,59,48,0.5); }
        .row-alert-red:hover { background: rgba(255, 59, 48, 0.12) !important; }
        .clickable-row { cursor: pointer; }
        
        .table-actions-btns { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .icon-btn-edit, .icon-btn-delete { 
            background: transparent; border: none; color: var(--text-muted); 
            cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;
            display: flex; align-items: center; justify-content: center;
        }
        .icon-btn-edit:hover { background: rgba(255,215,0,0.1); color: var(--primary); }
        .icon-btn-delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; }

        .obra-identity { display: flex; align-items: center; gap: 12px; }
        .obra-icon-mini { width: 32px; height: 32px; background: rgba(255,215,0,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        
        .count-badge { background: rgba(255,215,0,0.05); color: var(--primary); padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,215,0,0.1); }

        .money-value { font-size: 13px; font-weight: 700; font-family: monospace; color: var(--text-secondary); }
        .money-value.used     { color: #e67e22; }
        .money-value.positive { color: var(--status-approved); }
        .money-value.negative { color: var(--status-denied); }
        .address-cell { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); max-width: 400px; }
        .address-cell span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }

        .obras-grid-reduced { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .obra-card-small { padding: 24px; border-radius: 20px; border: 1px solid var(--border); transition: 0.3s; position: relative; }
        .clickable-card { cursor: pointer; }
        .obra-card-small:hover { border-color: var(--primary); transform: translateY(-4px); background: rgba(255,255,255,0.02); }
        
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .obra-card-small h3 { font-size: 18px; color: white; margin: 0; }
        
        .card-actions-mini { display: flex; gap: 4px; }
        .card-icon-action { 
            background: transparent; border: none; color: var(--text-muted); 
            cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s;
        }
        .card-icon-action:hover { background: rgba(255,215,0,0.1); color: var(--primary); }
        .card-icon-action.delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; }

        .card-mid { margin-bottom: 12px; }
        .order-pill { font-size: 10px; font-weight: 700; color: var(--primary); text-transform: uppercase; }
        .card-address { display: flex; align-items: center; gap: 8px; color: var(--text-muted); margin-bottom: 20px; }
        .card-address span { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .btn-card-enter { width: 100%; border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: white; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

        .add-obra-card-small { border: 2px dashed var(--border); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; color: var(--text-muted); transition: 0.3s; min-height: 160px; }
        .add-obra-card-small:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-glow); }

        .modal-card { width: 500px; padding: 48px; border-radius: 32px; }
        .modal-actions-btns { display: flex; justify-content: flex-end; gap: 16px; margin-top: 32px; }
        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .input-field input { width: 100%; padding: 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; color: white; outline: none; }
        .form-row-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      `}</style>
        </div>
    );
};

export default AdminObras;
