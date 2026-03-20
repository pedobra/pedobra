import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Box, Warehouse, MapPin, Upload, Download, MessageCircle, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import { maskPhone } from '../../lib/masks';
import { Trash2 } from 'lucide-react';

const AdminCatalog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const type = location.pathname.includes('suppliers') ? 'suppliers' : 'materials';

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminProfile, setAdminProfile] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchAdminProfile();
        fetchData();
        setSelectedIds([]);
    }, [type]);

    const fetchAdminProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setAdminProfile(data);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const table = type === 'materials' ? 'materials' : 'suppliers';
            const { data: res, error } = await supabase
                .from(table)
                .select('*')
                .order('name');

            if (error) throw error;
            setData(res || []);
        } catch (error: any) {
            console.error('Erro:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSVTemplate = () => {
        const headers = "Nome;Categoria;Unidade\n";
        const rows = [
            "Cimento Portland;Estrutural;saco",
            "Cabo Flexível 2.5mm;Elétrica;rolo",
            "Tubo PVC 100mm;Hidráulica;m",
            "Tinta Acrílica Branca;Acabamento;lata"
        ].join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao_materiais.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

            // Skip header
            const rows = lines.slice(1);
            const materialsToImport: any[] = [];
            let skippedCount = 0;
            const existingNames = new Set(data.map(m => m.name.toLowerCase().trim()));

            rows.forEach((line) => {
                const parts = line.split(';').map(s => s.trim());
                if (parts.length < 1) return;

                const [name, category, unit] = parts;
                if (!name) return;

                const normalizedName = name.toLowerCase();
                if (!existingNames.has(normalizedName)) {
                    materialsToImport.push({
                        name: name,
                        category: category || 'Geral',
                        unit: unit || 'un',
                        organization_id: adminProfile?.organization_id
                    });
                    existingNames.add(normalizedName);
                } else {
                    skippedCount++;
                }
            });

            if (materialsToImport.length === 0) {
                if (skippedCount > 0) {
                    alert(`Todos os ${skippedCount} materiais do arquivo já estão cadastrados.`);
                } else {
                    alert('Nenhum material válido encontrado no arquivo ou formato incorreto.');
                }
                e.target.value = '';
                return;
            }

            const confirmMsg = skippedCount > 0
                ? `Deseja importar ${materialsToImport.length} novos materiais? (${skippedCount} duplicados serão ignorados).`
                : `Deseja importar ${materialsToImport.length} materiais?`;

            if (!window.confirm(confirmMsg)) {
                e.target.value = '';
                return;
            }

            setLoading(true);
            const { error } = await supabase.from('materials').insert(materialsToImport);

            if (error) {
                alert('Erro na importação: ' + error.message);
            } else {
                alert('Importação concluída com sucesso!');
                fetchData();
            }
            setLoading(false);
            e.target.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleEdit = (item: any) => {
        navigate(`/admin/${type}/editar/${item.id}`);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Deseja excluir permanentemente os ${selectedIds.length} itens selecionados?`)) return;

        setLoading(true);
        try {
            const table = type === 'materials' ? 'materials' : 'suppliers';
            const { error } = await supabase.from(table).delete().in('id', selectedIds);
            if (error) throw error;
            
            setSelectedIds([]);
            fetchData();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: any[] = type === 'materials' ? [
        {
            header: 'Material',
            align: 'left',
            accessor: (item: any) => (
                <div className="item-cell">
                    <Box className="item-icon" size={14} />
                    <strong>{item.name}</strong>
                </div>
            )
        },
        {
            header: 'Categoria',
            align: 'center',
            accessor: (item: any) => <span className="cat-badge">{item.category}</span>
        },
        {
            header: 'Unidade',
            align: 'center',
            accessor: (item: any) => <span className="unit-tag">{item.unit}</span>
        },
        {
            header: 'Ações',
            align: 'right',
            accessor: (item: any) => (
                <div className="table-actions-btns" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
                </div>
            )
        }
    ] : [
        {
            header: 'Fornecedor',
            align: 'left',
            accessor: (item: any) => (
                <div className="item-cell">
                    <Warehouse className="item-icon" size={14} />
                    <div>
                        <strong>{item.name}</strong>
                        {item.address_city && (
                            <div className="supplier-location">
                                <MapPin size={10} /> {item.address_city} – {item.address_state}
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Especialidade',
            align: 'center',
            accessor: (item: any) => <span className="cat-badge">{item.specialty || 'Não Informada'}</span>
        },
        {
            header: 'Contato',
            align: 'center',
            accessor: (item: any) => <span>{item.contact_name || '—'}</span>
        },
        {
            header: 'WhatsApp',
            align: 'center',
            accessor: (item: any) => {
                if (!item.whatsapp) return '—';
                const cleanPhone = item.whatsapp.replace(/\D/g, '');
                return (
                    <a 
                        href={`https://wa.me/55${cleanPhone}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="wa-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MessageCircle size={14} />
                        {maskPhone(item.whatsapp)}
                    </a>
                );
            }
        },
        {
            header: 'Entrega',
            align: 'center',
            accessor: (item: any) => (
                <div className={`delivery-tag ${item.delivers ? 'yes' : 'no'}`}>
                    <Truck size={12} />
                    {item.delivers ? 'SIM' : 'NÃO'}
                </div>
            )
        },
        {
            header: 'Ações',
            align: 'right',
            accessor: (item: any) => (
                <div className="table-actions-btns" style={{ justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Edit2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="catalog-view animate-fade">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">{type === 'materials' ? 'Catálogo de Insumos' : 'Fornecedores'}</h1>
                    <p className="page-subtitle">Gerencie os recursos e parcerias da sua empresa.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Pesquisar..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    {type === 'materials' && (
                        <>
                            <button className="btn-secondary" onClick={downloadCSVTemplate} title="Baixar Modelo CSV">
                                <Download size={16} /> Modelo
                            </button>
                            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Upload size={16} /> Importar Planilha
                                <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
                            </label>
                        </>
                    )}
                    {selectedIds.length > 0 && (
                        <button className="btn-bulk-delete-header animate-fade-in-scale" onClick={handleBulkDelete}>
                            <Trash2 size={16} /> Excluir ({selectedIds.length})
                        </button>
                    )}
                    <button className="btn-primary" onClick={() => navigate(`/admin/${type}/novo`)}>
                        <Plus size={20} /> {type === 'materials' ? 'Novo Material' : 'Novo Fornecedor'}
                    </button>
                </div>
            </header>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-floating animate-pop-in">
                    <div className="bulk-content-glass">
                        <div className="selection-count">
                            <span className="count-pill">{selectedIds.length}</span>
                            <span className="count-label">{selectedIds.length === 1 ? 'Item Selecionado' : 'Itens Selecionados'}</span>
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
                title={type === 'materials' ? 'Lista de Materiais' : 'Lista de Fornecedores'}
                subtitle={`Total de ${filteredData.length} registros.`}
            >
                <ModernTable 
                    columns={columns} 
                    data={filteredData} 
                    loading={loading}
                    selectable={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onRowClick={handleEdit}
                />
            </StandardCard>

            <style>{`
                .catalog-view { display: flex; flex-direction: column; gap: 24px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .page-title { font-size: 28px; font-weight: 850; margin-bottom: 4px; letter-spacing: -0.5px; }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 12px; align-items: center; }
                .search-bar-glass {
                   background: var(--bg-dark); border: 1px solid var(--border);
                   border-radius: 8px; padding: 0 16px; display: flex; align-items: center; gap: 10px; width: 260px;
                   height: 44px;
                }
                .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 13px; }

                .item-cell { display: flex; align-items: center; gap: 12px; }
                .item-icon { color: var(--primary); }
                .cat-badge { background: var(--bg-dark); padding: 4px 8px; border-radius: 6px; font-size: 12px; }
                .unit-tag { color: var(--text-muted); font-size: 12px; font-weight: 700; }
                
                .supplier-location { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
                .wa-link { display: inline-flex; align-items: center; gap: 6px; color: #25D366; text-decoration: none; font-weight: 600; font-size: 13px; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; }
                .wa-link:hover { background: rgba(37, 211, 102, 0.1); }
                
                .delivery-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 100px; }
                .delivery-tag.yes { background: rgba(16, 185, 129, 0.1); color: #10B981; }
                .delivery-tag.no { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
                
                .table-actions-btns { display: flex; gap: 8px; }

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

                .btn-bulk-delete-header {
                    background: rgba(239, 68, 68, 0.1);
                    color: #EF4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    height: 44px;
                    padding: 0 16px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btn-bulk-delete-header:hover {
                    background: #EF4444;
                    color: white;
                }

                .animate-pop-in {
                    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }

                .animate-fade-in-scale {
                    animation: fadeInScale 0.3s ease-out;
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default AdminCatalog;
