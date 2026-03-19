import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Box, Warehouse, MapPin, Upload, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';
import { maskPhone } from '../../lib/masks';

const AdminCatalog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const type = location.pathname.includes('suppliers') ? 'suppliers' : 'materials';

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [type]);

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
                        unit: unit || 'un'
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

    const filteredData = data.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = type === 'materials' ? [
        {
            header: 'Material',
            accessor: (item: any) => (
                <div className="item-cell">
                    <Box className="item-icon" size={14} />
                    <strong>{item.name}</strong>
                </div>
            )
        },
        {
            header: 'Categoria',
            accessor: (item: any) => <span className="cat-badge">{item.category}</span>
        },
        {
            header: 'Unidade',
            accessor: (item: any) => <span className="unit-tag">{item.unit}</span>
        },
        {
            header: 'Ações',
            accessor: (item: any) => (
                <div className="table-actions-btns">
                    <button className="icon-btn" onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
                </div>
            )
        }
    ] : [
        {
            header: 'Fornecedor',
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
            header: 'Contato',
            accessor: (item: any) => <span>{item.contact_name || '—'}</span>
        },
        {
            header: 'WhatsApp',
            accessor: (item: any) => <span>{maskPhone(item.whatsapp || '') || '—'}</span>
        },
        {
            header: 'Ações',
            accessor: (item: any) => (
                <div className="table-actions-btns">
                    <button className="icon-btn" onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
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
                    <button className="btn-primary" onClick={() => navigate(`/admin/${type}/novo`)}>
                        <Plus size={20} /> {type === 'materials' ? 'Novo Material' : 'Novo Fornecedor'}
                    </button>
                </div>
            </header>

            <StandardCard
                title={type === 'materials' ? 'Lista de Materiais' : 'Lista de Fornecedores'}
                subtitle={`Total de ${filteredData.length} registros.`}
            >
                <ModernTable columns={columns} data={filteredData} loading={loading} />
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
                .table-actions-btns { display: flex; gap: 8px; }
            `}</style>
        </div>
    );
};

export default AdminCatalog;
