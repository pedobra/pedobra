import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Box, Search, Trash2, Warehouse, MessageCircle, MapPin, Loader2, Truck } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SPECIALTY_OPTIONS = [
    'Construção Civil',
    'Elétrica',
    'Hidráulica / Encanamento',
    'Alvenaria / Estrutura',
    'Acabamento / Pintura',
    'Esquadrias / Vidraçaria',
    'Impermeabilização',
    'Ar Condicionado / HVAC',
    'Segurança / CFTV',
    'Fundação / Terraplanagem',
    'Paisagismo',
    'Locação de Equipamentos',
    'Distribuição de Materiais',
    'Logística / Transporte',
    'Ferragens em Geral',
    'Outros',
];

const EMPTY_SUPPLIER = {
    name: '',
    cnpj: '',
    contact: '',
    rating: 5,
    contact_name: '',
    whatsapp: '',
    specialty: '',
    delivers: false,
    address_cep: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
};

const AdminCatalog = () => {
    const location = useLocation();
    const type = location.pathname.includes('suppliers') ? 'suppliers' : 'materials';

    const [data, setData] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Specialty kept as isolated state to avoid stale-closure issues
    const [specialtySelect, setSpecialtySelect] = useState('');
    const [specialtyCustom, setSpecialtyCustom] = useState('');
    // Delivers toggle (boolean)
    const [delivers, setDelivers] = useState(false);

    const [materialForm, setMaterialForm] = useState({ name: '', category: '', unit: '' });
    const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);

    useEffect(() => { fetchData(); }, [type]);

    const fetchData = async () => {
        const { data: res } = await supabase.from(type).select('*').order('created_at', { ascending: false });
        if (res) setData(res);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        if (type === 'materials') {
            setMaterialForm({ name: item.name, category: item.category, unit: item.unit });
        } else {
            const savedSpecialty = item.specialty || '';
            const isKnown = SPECIALTY_OPTIONS.includes(savedSpecialty);
            setSpecialtySelect(isKnown ? savedSpecialty : (savedSpecialty ? 'Outros' : ''));
            setSpecialtyCustom(!isKnown && savedSpecialty ? savedSpecialty : '');
            setDelivers(!!item.delivers);
            setSupplierForm({
                name: item.name || '',
                cnpj: item.cnpj || '',
                contact: item.contact || '',
                rating: item.rating || 5,
                contact_name: item.contact_name || '',
                whatsapp: item.whatsapp || '',
                specialty: '',
                delivers: !!item.delivers,
                address_cep: item.address_cep || '',
                address_street: item.address_street || '',
                address_number: item.address_number || '',
                address_neighborhood: item.address_neighborhood || '',
                address_city: item.address_city || '',
                address_state: item.address_state || '',
            });
        }
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;
        setLoading(true);
        const { error } = await supabase.from(type).delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setMaterialForm({ name: '', category: '', unit: '' });
        setSupplierForm(EMPTY_SUPPLIER);
        setSpecialtySelect('');
        setSpecialtyCustom('');
        setDelivers(false);
        setShowModal(true);
    };

    const handleCepLookup = async (cep: string) => {
        const cleaned = cep.replace(/\D/g, '');
        if (cleaned.length !== 8) return;
        setCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
            const json = await res.json();
            if (!json.erro) {
                setSupplierForm(prev => ({
                    ...prev,
                    address_street: json.logradouro || prev.address_street,
                    address_neighborhood: json.bairro || prev.address_neighborhood,
                    address_city: json.localidade || prev.address_city,
                    address_state: json.uf || prev.address_state,
                }));
            }
        } catch {
            // silently fail
        } finally {
            setCepLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const resolvedSpecialty = specialtySelect === 'Outros' ? specialtyCustom : specialtySelect;
        const body = type === 'materials'
            ? materialForm
            : { ...supplierForm, specialty: resolvedSpecialty, delivers };

        const { error } = editingItem
            ? await supabase.from(type).update(body).eq('id', editingItem.id)
            : await supabase.from(type).insert(body);

        if (error) alert(error.message);
        else {
            setShowModal(false);
            fetchData();
            setMaterialForm({ name: '', category: '', unit: '' });
            setSupplierForm(EMPTY_SUPPLIER);
            setSpecialtySelect('');
            setSpecialtyCustom('');
            setDelivers(false);
            setEditingItem(null);
        }
        setLoading(false);
    };

    return (
        <div className="catalog-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">{type === 'materials' ? 'Gerenciamento de Materiais' : 'Gerenciamento de Fornecedores'}</h1>
                    <p className="page-subtitle">Centralização de dados para otimização de suprimentos.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder={`Buscar ${type === 'materials' ? 'material' : 'fornecedor'}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <Plus size={18} /> {type === 'materials' ? 'Cadastrar Insumo' : 'Novo Fornecedor'}
                    </button>
                </div>
            </header>

            <div className="premium-table-wrapper">
                <table className="modern-table">
                    <thead>
                        {type === 'materials' ? (
                            <tr>
                                <th>MATERIAL</th>
                                <th>CATEGORIA</th>
                                <th style={{ textAlign: 'center' }}>UN</th>
                                <th style={{ textAlign: 'right' }}>AÇÕES</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>FORNECEDOR</th>
                                <th>ESPECIALIDADE</th>
                                <th>CONTATO</th>
                                <th>BAIRRO</th>
                                <th style={{ textAlign: 'center' }}>ENTREGA</th>
                                <th style={{ textAlign: 'right' }}>AÇÕES</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {data.filter(item => {
                            const term = searchTerm.toLowerCase();
                            return (item.name || '').toLowerCase().includes(term) ||
                                (item.category || '').toLowerCase().includes(term) ||
                                (item.specialty || '').toLowerCase().includes(term) ||
                                (item.contact_name || '').toLowerCase().includes(term);
                        }).map(item => (
                            <tr key={item.id} className="clickable-row" onClick={() => handleEdit(item)}>
                                {type === 'materials' ? (
                                    <>
                                        <td>
                                            <div className="item-cell">
                                                <Box className="item-icon" size={14} />
                                                <strong>{item.name}</strong>
                                            </div>
                                        </td>
                                        <td><span className="cat-badge">{item.category}</span></td>
                                        <td style={{ textAlign: 'center' }}><span className="unit-tag">{item.unit}</span></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ minWidth: 160 }}>
                                            <div className="item-cell">
                                                <Warehouse className="item-icon" size={14} />
                                                <div>
                                                    <strong>{item.name}</strong>
                                                    {(item.address_city || item.address_state) && (
                                                        <div className="supplier-location">
                                                            <MapPin size={10} />
                                                            {[item.address_city, item.address_state].filter(Boolean).join(' – ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: 130 }}>
                                            {item.specialty
                                                ? <span className="specialty-badge">{item.specialty}</span>
                                                : <span className="text-muted-sm">—</span>
                                            }
                                        </td>
                                        <td>
                                            <div className="contact-cell">
                                                <span>{item.contact_name || 'N/A'}</span>
                                                {item.whatsapp && (
                                                    <a href={`https://wa.me/55${item.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="whatsapp-link-icon" onClick={e => e.stopPropagation()} title="Abrir WhatsApp">
                                                        <MessageCircle size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>{item.address_neighborhood || <span className="text-muted-sm">—</span>}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.delivers
                                                ? <span className="delivers-badge yes"><Truck size={12} /></span>
                                                : <span className="delivers-badge no">—</span>
                                            }
                                        </td>
                                    </>
                                )}
                                <td style={{ textAlign: 'right' }}>
                                    <div className="table-actions-btns" onClick={e => e.stopPropagation()}>
                                        <button className="icon-btn-delete" onClick={() => handleDelete(item.id)} title="Remover"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay glass" onClick={() => setShowModal(false)}>
                    <div className="modal-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingItem ? 'Editar Registro' : 'Novo Registro no Catálogo'}</h2>
                            <p>Insira os detalhes técnicos.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            {type === 'materials' ? (
                                <>
                                    <div className="input-field">
                                        <label>Designação do Insumo</label>
                                        <input type="text" value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} placeholder="Ex: Cimento Portland CPII" required />
                                    </div>
                                    <div className="input-group">
                                        <div className="input-field">
                                            <label>Categoria Estrutural</label>
                                            <select value={materialForm.category} onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })} required>
                                                <option value="">Selecione...</option>
                                                <option value="Estrutural">Estrutural</option>
                                                <option value="Elétrica">Elétrica</option>
                                                <option value="Hidráulica">Hidráulica</option>
                                                <option value="Acabamento">Acabamento</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                        <div className="input-field">
                                            <label>Unidade Padrão</label>
                                            <select value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} required>
                                                <option value="">Selecione...</option>
                                                <option value="un">un (Unidade)</option>
                                                <option value="kg">kg (Quilograma)</option>
                                                <option value="t">t (Tonelada)</option>
                                                <option value="g">g (Grama)</option>
                                                <option value="m">m (Metro Linear)</option>
                                                <option value="m²">m² (Metro Quadrado)</option>
                                                <option value="m³">m³ (Metro Cúbico)</option>
                                                <option value="L">L (Litro)</option>
                                                <option value="ml">ml (Mililitro)</option>
                                                <option value="cx">cx (Caixa)</option>
                                                <option value="saco">saco (Saco)</option>
                                                <option value="lata">lata (Lata)</option>
                                                <option value="galão">galão (Galão)</option>
                                                <option value="rolo">rolo (Rolo)</option>
                                                <option value="cj">cj (Conjunto)</option>
                                                <option value="par">par (Par)</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* ── Identificação ── */}
                                    <div className="form-section-label">Identificação</div>
                                    <div className="input-field">
                                        <label>Razão Social / Nome Fantasia</label>
                                        <input type="text" value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Supply Engenharia LTDA" required />
                                    </div>
                                    <div className="input-group">
                                        <div className="input-field">
                                            <label>CNPJ Corporativo</label>
                                            <input type="text" value={supplierForm.cnpj} onChange={e => setSupplierForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                                        </div>
                                        <div className="input-field">
                                            <label>Nível de Confiabilidade (1-5)</label>
                                            <input type="number" min="1" max="5" value={supplierForm.rating} onChange={e => setSupplierForm(p => ({ ...p, rating: parseInt(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ alignItems: 'flex-start' }}>
                                        <div className="input-field" style={{ flex: 1 }}>
                                            <label>Especialidade</label>
                                            <select
                                                value={specialtySelect}
                                                onChange={e => {
                                                    setSpecialtySelect(e.target.value);
                                                    if (e.target.value !== 'Outros') setSpecialtyCustom('');
                                                }}
                                            >
                                                <option value="">Selecione...</option>
                                                {SPECIALTY_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* ── Entrega Toggle ── */}
                                        <div className="input-field">
                                            <label>Faz Entrega?</label>
                                            <button
                                                type="button"
                                                className={`delivers-toggle ${delivers ? 'on' : 'off'}`}
                                                onClick={() => setDelivers(v => !v)}
                                            >
                                                <span className="toggle-knob" />
                                                <span className="toggle-label">{delivers ? 'Sim' : 'Não'}</span>
                                            </button>
                                        </div>
                                    </div>
                                    {specialtySelect === 'Outros' && (
                                        <div className="input-field specialty-custom-field">
                                            <label>Descreva a Especialidade</label>
                                            <input
                                                type="text"
                                                value={specialtyCustom}
                                                onChange={e => setSpecialtyCustom(e.target.value)}
                                                placeholder="Ex: Montagem de Andaimes"
                                                autoFocus
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* ── Contato ── */}
                                    <div className="form-section-label">Contato</div>
                                    <div className="input-field">
                                        <label>Canal de Atendimento (E-mail / Tel Institucional)</label>
                                        <input type="text" value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} placeholder="comercial@parceiro.com" />
                                    </div>
                                    <div className="input-group">
                                        <div className="input-field">
                                            <label>Nome do Contato</label>
                                            <input type="text" value={supplierForm.contact_name} onChange={e => setSupplierForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Nome do representante" required />
                                        </div>
                                        <div className="input-field">
                                            <label>WhatsApp (Ex: 11999999999)</label>
                                            <input type="text" value={supplierForm.whatsapp} onChange={e => setSupplierForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
                                        </div>
                                    </div>

                                    {/* ── Endereço ── */}
                                    <div className="form-section-label">
                                        <MapPin size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                        Endereço
                                    </div>
                                    <div className="input-group" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                        <div className="input-field">
                                            <label>CEP</label>
                                            <div className="cep-input-wrapper">
                                                <input
                                                    type="text"
                                                    value={supplierForm.address_cep}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSupplierForm(p => ({ ...p, address_cep: val }));
                                                        if (val.replace(/\D/g, '').length === 8) handleCepLookup(val);
                                                    }}
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                />
                                                {cepLoading && <span className="cep-loader"><Loader2 size={14} className="spin" /></span>}
                                            </div>
                                        </div>
                                        <div className="input-field">
                                            <label>Rua / Logradouro</label>
                                            <input type="text" value={supplierForm.address_street} onChange={e => setSupplierForm(p => ({ ...p, address_street: e.target.value }))} placeholder="Av. Brasil" />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                        <div className="input-field">
                                            <label>Número</label>
                                            <input type="text" value={supplierForm.address_number} onChange={e => setSupplierForm(p => ({ ...p, address_number: e.target.value }))} placeholder="123" />
                                        </div>
                                        <div className="input-field">
                                            <label>Bairro</label>
                                            <input type="text" value={supplierForm.address_neighborhood} onChange={e => setSupplierForm(p => ({ ...p, address_neighborhood: e.target.value }))} placeholder="Centro" />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ gridTemplateColumns: '2fr 1fr' }}>
                                        <div className="input-field">
                                            <label>Cidade</label>
                                            <input type="text" value={supplierForm.address_city} onChange={e => setSupplierForm(p => ({ ...p, address_city: e.target.value }))} placeholder="São Paulo" />
                                        </div>
                                        <div className="input-field">
                                            <label>Estado (UF)</label>
                                            <input type="text" value={supplierForm.address_state} onChange={e => setSupplierForm(p => ({ ...p, address_state: e.target.value.toUpperCase() }))} placeholder="SP" maxLength={2} />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="modal-actions-btns">
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Sincronizando...' : (editingItem ? 'Confirmar Edição' : 'Confirmar Registro')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .catalog-view { display: flex; flex-direction: column; gap: 32px; }
        .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
        .page-subtitle { color: var(--text-secondary); font-size: 13px; }

        .header-actions { display: flex; gap: 12px; align-items: center; }
        .search-bar-glass {
            background: rgba(255,255,255,0.03); border: 1px solid var(--border);
            border-radius: 12px; padding: 0 14px; display: flex; align-items: center; gap: 10px;
            width: 260px; height: 42px;
        }
        .search-bar-glass input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 13px; }

        .premium-table-wrapper {
            background: var(--bg-card);
            border-radius: 20px;
            border: 1px solid var(--border);
            overflow: hidden;
            width: 100%;
        }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
        .modern-table th { padding: 12px 10px; font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; }
        .modern-table td { padding: 11px 10px; font-size: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 0; }
        .modern-table tr:last-child td { border-bottom: none; }
        .modern-table tr { transition: 0.2s; }
        .modern-table tr:hover { background: rgba(255,255,255,0.02); }
        .clickable-row { cursor: pointer; }

        /* Column widths — 6 cols: FORNECEDOR | ESPECIALIDADE | CONTATO | BAIRRO | ENTREGA | AÇÕES */
        .modern-table th:nth-child(1), .modern-table td:nth-child(1) { width: 28%; }
        .modern-table th:nth-child(2), .modern-table td:nth-child(2) { width: 22%; }
        .modern-table th:nth-child(3), .modern-table td:nth-child(3) { width: 16%; }
        .modern-table th:nth-child(4), .modern-table td:nth-child(4) { width: 20%; }
        .modern-table th:nth-child(5), .modern-table td:nth-child(5) { width: 8%; text-align: center; }
        .modern-table th:nth-child(6), .modern-table td:nth-child(6) { width: 6%; }

        /* Mobile: scroll horizontal, sem truncamento */
        @media (max-width: 768px) {
            .premium-table-wrapper {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                border-radius: 12px;
            }
            .modern-table {
                min-width: 620px;
                table-layout: auto;
            }
            .modern-table th:nth-child(n),
            .modern-table td:nth-child(n) { width: auto; }
            .modern-table td {
                overflow: visible;
                text-overflow: clip;
                max-width: none;
                white-space: nowrap;
                padding: 10px 12px;
            }
        }

        .item-cell { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .item-icon { color: var(--primary); flex-shrink: 0; }

        .cat-badge {
            background: rgba(255,255,255,0.06); padding: 3px 10px;
            border-radius: 100px; font-size: 11px; color: var(--text-secondary);
            white-space: nowrap;
        }
        .specialty-badge {
            display: inline-block;
            background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.15);
            padding: 2px 7px; border-radius: 6px; font-size: 11px; color: var(--primary);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            max-width: 100%; vertical-align: middle;
        }
        .unit-tag { font-family: monospace; color: var(--primary); font-weight: 600; }
        .text-muted-sm { color: var(--text-muted); font-size: 12px; }

        .supplier-location { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); margin-top: 2px; }
        .contact-cell { display: flex; align-items: center; gap: 6px; }
        .email-cell { font-size: 11px; color: var(--text-secondary); }

        /* Delivers badge in table */
        .delivers-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600;
        }
        .delivers-badge.yes { background: rgba(37,211,102,0.12); color: #25D366; border: 1px solid rgba(37,211,102,0.2); }
        .delivers-badge.no  { background: rgba(255,255,255,0.04); color: var(--text-muted); border: 1px solid var(--border); }

        .table-actions-btns { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        .icon-btn-edit, .icon-btn-delete {
            background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-secondary);
            border-radius: 7px; padding: 6px; display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.2s;
        }
        .icon-btn-edit:hover { background: rgba(255,215,0,0.1); color: var(--primary); border-color: rgba(255,215,0,0.2); }
        .icon-btn-delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }

        .whatsapp-link-icon { color: #25D366; display: flex; align-items: center; background: rgba(37,211,102,0.1); padding: 5px; border-radius: 7px; transition: 0.2s; flex-shrink: 0; }
        .whatsapp-link-icon:hover { background: rgba(37,211,102,0.2); transform: scale(1.05); }

        /* Modal */
        .modal-card { width: 680px; max-height: 88vh; overflow-y: auto; padding: 40px; border-radius: 28px; }
        .input-group { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .input-field { margin-bottom: 16px; }
        .input-field label { display: block; font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; }
        .input-field input, .input-field select { width: 100%; padding: 12px 14px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; color: white; outline: none; font-size: 13px; box-sizing: border-box; }
        .input-field input:focus, .input-field select:focus { border-color: var(--primary); }
        .modal-actions-btns { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }

        .form-section-label {
            font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase;
            letter-spacing: 1.5px; margin-bottom: 14px; margin-top: 4px;
            padding-bottom: 7px; border-bottom: 1px solid rgba(255,215,0,0.12);
            display: flex; align-items: center;
        }

        /* Delivers toggle button */
        .delivers-toggle {
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 10px 14px;
            border-radius: 10px; border: 1px solid var(--border);
            cursor: pointer; transition: 0.25s; background: var(--bg-input);
            font-size: 13px; font-weight: 600;
        }
        .delivers-toggle.on  { border-color: rgba(37,211,102,0.4); background: rgba(37,211,102,0.08); color: #25D366; }
        .delivers-toggle.off { color: var(--text-muted); }
        .toggle-knob {
            width: 36px; height: 20px; border-radius: 100px; flex-shrink: 0;
            background: var(--border); position: relative; transition: 0.25s;
        }
        .delivers-toggle.on .toggle-knob { background: #25D366; }
        .toggle-knob::after {
            content: ''; position: absolute; top: 3px; left: 3px;
            width: 14px; height: 14px; border-radius: 50%; background: white;
            transition: 0.25s;
        }
        .delivers-toggle.on .toggle-knob::after { left: 19px; }

        /* CEP */
        .cep-input-wrapper { position: relative; display: flex; align-items: center; }
        .cep-input-wrapper input { padding-right: 38px; }
        .cep-loader { position: absolute; right: 12px; display: flex; align-items: center; color: var(--primary); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .specialty-custom-field { animation: slideDown 0.18s ease; }
        .specialty-custom-field input { border-color: rgba(255,215,0,0.3) !important; background: rgba(255,215,0,0.04) !important; }
      `}</style>
        </div>
    );
};

export default AdminCatalog;
