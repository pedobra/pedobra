import React from 'react';
import { Check, Minus } from 'lucide-react';

interface Column<T> {
    header: string;
    accessor: (item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface ModernTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    selectable?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    onRowClick?: (item: T) => void;
    idField?: string;
}

function ModernTable<T>({ 
    columns, 
    data, 
    loading, 
    emptyMessage = 'Nenhum registro encontrado.', 
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    onRowClick,
    idField = 'id'
}: ModernTableProps<T>) {
    
    const handleToggleAll = () => {
        if (!onSelectionChange) return;
        if (selectedIds.length === data.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(data.map((item: any) => item[idField]));
        }
    };

    const handleToggleRow = (id: string) => {
        if (!onSelectionChange) return;
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    if (loading) {
        return (
            <div className="modern-table-loading">
                <div className="spinner"></div>
                <span>Carregando dados...</span>
                <style>{`
                    .modern-table-loading { padding: 80px; display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-muted); }
                    .spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.82s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="modern-table-empty">
                <div className="empty-icon">📂</div>
                <p>{emptyMessage}</p>
                <style>{`
                    .modern-table-empty { padding: 80px; text-align: center; color: var(--text-muted); background: var(--bg-dark); border-radius: 12px; border: 1px dashed var(--border); }
                    .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
                `}</style>
            </div>
        );
    }

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

    return (
        <div className="modern-table-wrapper">
            <table className="modern-table">
                <thead>
                    <tr>
                        {selectable && (
                            <th className="checkbox-col">
                                <div 
                                    className={`checkbox-custom ${isAllSelected || isIndeterminate ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleAll();
                                    }}
                                >
                                    {isAllSelected && <Check size={12} strokeWidth={4} />}
                                    {isIndeterminate && <Minus size={12} strokeWidth={4} />}
                                </div>
                            </th>
                        )}
                        {columns.map((col, i) => (
                            <th key={i} style={{ textAlign: col.align || 'center' }}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item: any, rowIdx) => {
                        const id = item[idField];
                        const isSelected = selectedIds.includes(id);

                        return (
                            <tr 
                                key={id || rowIdx} 
                                className={`${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                                onClick={() => onRowClick && onRowClick(item)}
                            >
                                {selectable && (
                                    <td className="checkbox-col">
                                        <div 
                                            className={`checkbox-custom ${isSelected ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleRow(id);
                                            }}
                                        >
                                            {isSelected && <Check size={12} strokeWidth={4} />}
                                        </div>
                                    </td>
                                )}
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} style={{ textAlign: col.align || 'center' }}>{col.accessor(item)}</td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <style>{`
                .modern-table-wrapper { width: 100%; overflow-x: auto; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); }
                .modern-table { width: 100%; border-collapse: collapse; text-align: center; table-layout: auto; }
                
                .modern-table th {
                    background: var(--bg-dark);
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border);
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: none;
                    letter-spacing: normal;
                    white-space: nowrap;
                }

                .modern-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border);
                    color: var(--text-primary);
                    font-size: 14px;
                    vertical-align: middle;
                    transition: background 0.1s;
                }

                .modern-table tr:last-child td { border-bottom: none; }
                .modern-table tr:hover td { background: var(--bg-dark); }
                .modern-table tr.clickable { cursor: pointer; }
                .modern-table tr.selected td { background: rgba(255,215,0,0.02); }

                .checkbox-col { width: 44px; padding-right: 0 !important; }
                .checkbox-custom {
                    width: 18px; height: 18px; border: 1.5px solid var(--border-bright); border-radius: 4px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
                    background: var(--bg-card); color: var(--bg-card);
                }
                .checkbox-custom:hover { border-color: var(--primary); }
                .checkbox-custom.active { border-color: var(--text-primary); background: var(--text-primary); }
                
                .modern-table-wrapper::-webkit-scrollbar { height: 8px; }
                .modern-table-wrapper::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 4px; }
            `}</style>
        </div>
    );
}

export default ModernTable;
