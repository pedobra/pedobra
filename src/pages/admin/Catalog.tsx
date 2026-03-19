import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Box, Search, Trash2, Warehouse, MessageCircle, MapPin, Truck, Upload, Download } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModernTable from '../../components/ui/ModernTable';
import StandardCard from '../../components/ui/StandardCard';

const AdminCatalog = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const type = location.pathname.includes('suppliers') ? 'suppliers' : 'materials';

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchData(); }, [type]);

    const fetchData = async () => {
        const { data: res } = await supabase.from(type).select('*').order('created_at', { ascending: false });
        if (res) setData(res);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;
        setLoading(true);
        const { error } = await supabase.from(type).delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
        setLoading(false);
    };

    const handleEdit = (item: any) => {
        const path = type === 'materials' 
            ? `/admin/materiais/editar/${item.id}` 
            : `/admin/fornecedores/editar/${item.id}`;
        navigate(path);
    };

    const handleCreate = () => {
        const path = type === 'materials' 
            ? '/admin/materiais/novo' 
            : '/admin/fornecedores/novo';
        navigate(path);
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
                alert(skippedCount > 0 ? `Todos os ${skippedCount} materiais já estão cadastrados.` : 'Nenhum material válido encontrado.');
                e.target.value = '';
                return;
            }

            if (!window.confirm(`Importar ${materialsToImport.length} novos materiais?`)) {
                e.target.value = '';
                return;
            }

            setLoading(true);
            const { error } = await supabase.from('materials').insert(materialsToImport);
            if (error) alert('Erro na importação: ' + error.message);
            else {
                alert('Importação concluída!');
                fetchData();
            }
            setLoading(false);
            e.target.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };

    const filteredData = data.filter(item => {
        const term = searchTerm.toLowerCase();
        return (item.name || '').toLowerCase().includes(term) ||
            (item.category || '').toLowerCase().includes(term) ||
            (item.specialty || '').toLowerCase().includes(term) ||
            (item.contact_name || '').toLowerCase().includes(term);
    });

    return (
        <div className="catalog-view">
            <header className="view-header">
                <div className="header-info">
                    <h1 className="page-title">{type === 'materials' ? 'Gestão de Materiais' : 'Rede de Fornecedores'}</h1>
                    <p className="page-subtitle">Central de insumos e parceiros estratégicos do sistema.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-glass">
                        <Search size={16} color="var(--text-muted)" />
                        <input type="text" placeholder={`Buscar ${type === 'materials' ? 'insumo' : 'parceiro'}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {type === 'materials' && (
                        <div className="csv-actions">
                            <button className="btn-ghost" onClick={downloadCSVTemplate} title="Baixar Modelo CSV">
                                <Download size={18} /> Modelo
                            </button>
                            <label className="btn-ghost csv-label">
                                <Upload size={18} /> Importar CSV
                                <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
                            </label>
                        </div>
                    )}
                    <button className="btn-primary" onClick={handleCreate}>
                        <Plus size={18} /> {type === 'materials' ? 'Novo Material' : 'Novo Fornecedor'}
                    </button>
                </div>
            </header>

            <StandardCard 
                title={type === 'materials' ? "Catálogo de Insumos" : "Base de Fornecedores"} 
                subtitle={`Total de ${filteredData.length} registros encontrados.`}
            >
                <ModernTable headers={type === 'materials' 
                    ? ['Material', 'Categoria', 'UN', 'Ações'] 
                    : ['Fornecedor', 'Especialidade', 'Contato', 'Entrega', 'Ações']}>
                    {filteredData.map(item => (
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
                                    <td><span className="unit-tag">{item.unit}</span></td>
                                </>
                            ) : (
                                <>
                                    <td>
                                        <div className="item-cell">
                                            <Warehouse className="item-icon" size={14} />
                                            <div>
                                                <strong>{item.name}</strong>
                                                {(item.address_city) && (
                                                    <div className="supplier-location">
                                                        <MapPin size={10} /> {item.address_city} – {item.address_state}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {item.specialty ? <span className="specialty-badge">{item.specialty}</span> : '—'}
                                    </td>
                                    <td>
                                        <div className="contact-cell">
                                            <span>{item.contact_name || 'N/A'}</span>
                                            {item.whatsapp && (
                                                <a href={`https://wa.me/55${item.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="whatsapp-link-icon" onClick={e => e.stopPropagation()}>
                                                    <MessageCircle size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {item.delivers ? <Truck size={14} className="delivers-icon yes" /> : <span className="text-muted">—</span>}
                                    </td>
                                </>
                            )}
                            <td style={{ textAlign: 'right' }}>
                                <button className="icon-btn-delete" onClick={(e) => handleDelete(item.id, e)}><Trash2 size={14} /></button>
                            </td>
                        </tr>
                    ))}
                </ModernTable>
            </StandardCard>

            <style>{`
                .catalog-view { display: flex; flex-direction: column; gap: 32px; }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .page-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; color: var(--text-primary); }
                .page-subtitle { color: var(--text-muted); font-size: 14px; }
                
                .header-actions { display: flex; gap: 12px; align-items: center; }
                .search-bar-glass { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 0 14px; display: flex; align-items: center; gap: 10px; width: 260px; height: 42px; }
                .search-bar-glass input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 13px; }
                
                .csv-actions { display: flex; gap: 8px; }
                .csv-label { cursor: pointer; display: flex; align-items: center; gap: 8px; }

                .item-cell { display: flex; align-items: center; gap: 12px; }
                .item-icon { color: var(--primary); }
                .cat-badge { background: var(--bg-dark); border: 1px solid var(--border); padding: 4px 12px; border-radius: 100px; font-size: 11px; color: var(--text-secondary); }
                .unit-tag { font-family: monospace; color: var(--primary); font-weight: 700; font-size: 11px; }
                
                .specialty-badge { background: var(--primary-glow); border: 1px solid var(--border); padding: 4px 10px; border-radius: 8px; font-size: 11px; color: var(--primary); font-weight: 600; }
                .supplier-location { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); margin-top: 4px; }
                .contact-cell { display: flex; align-items: center; gap: 8px; }
                .whatsapp-link-icon { color: #25D366; background: rgba(37,211,102,0.1); padding: 6px; border-radius: 8px; display: flex; }
                .delivers-icon.yes { color: #25D366; }

                .icon-btn-delete { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .icon-btn-delete:hover { background: rgba(255,59,48,0.1); color: #FF3B30; border-color: rgba(255,59,48,0.2); }
            `}</style>
        </div>
    );
};

export default AdminCatalog;
