import React from 'react';

interface Column<T> {
    header: string;
    accessor: (item: T) => React.ReactNode;
}

interface ModernTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    selectable?: boolean;
}

function ModernTable<T>({ columns, data, loading, emptyMessage = 'Nenhum registro encontrado.', selectable = true }: ModernTableProps<T>) {
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

    return (
        <div className="modern-table-wrapper">
            <table className="modern-table">
                <thead>
                    <tr>
                        {selectable && (
                            <th className="checkbox-col">
                                <div className="checkbox-custom master">
                                    <div className="checkbox-inner"></div>
                                </div>
                            </th>
                        )}
                        {columns.map((col, i) => (
                            <th key={i}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, rowIdx) => (
                        <tr key={rowIdx}>
                            {selectable && (
                                <td className="checkbox-col">
                                    <div className="checkbox-custom">
                                        <div className="checkbox-inner"></div>
                                    </div>
                                </td>
                            )}
                            {columns.map((col, colIdx) => (
                                <td key={colIdx}>{col.accessor(item)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style>{`
                .modern-table-wrapper { width: 100%; overflow-x: auto; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); }
                .modern-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: auto; }
                
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

                .checkbox-col { width: 44px; padding-right: 0 !important; }
                .checkbox-custom {
                    width: 18px; height: 18px; border: 1.5px solid var(--border-bright); border-radius: 4px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
                    background: var(--bg-card);
                }
                .checkbox-custom.master { border-color: var(--text-primary); background: var(--text-primary); }
                .checkbox-custom.master .checkbox-inner { width: 8px; height: 1.5px; background: var(--bg-card); }
                
                /* Selection state mockup */
                tr:nth-child(4) .checkbox-custom, tr:nth-child(5) .checkbox-custom {
                    background: var(--text-primary); border-color: var(--text-primary);
                }
                tr:nth-child(4) .checkbox-custom::after, tr:nth-child(5) .checkbox-custom::after {
                    content: '✓'; color: var(--bg-card); font-size: 12px; font-weight: 900;
                }

                .modern-table-wrapper::-webkit-scrollbar { height: 8px; }
                .modern-table-wrapper::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 4px; }
            `}</style>
        </div>
    );
}

export default ModernTable;
