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
}

function ModernTable<T>({ columns, data, loading, emptyMessage = 'Nenhum registro encontrado.' }: ModernTableProps<T>) {
    if (loading) {
        return (
            <div className="modern-table-loading">
                <div className="spinner"></div>
                <span>Carregando dados...</span>
                <style>{`
                    .modern-table-loading {
                        padding: 60px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 16px;
                        color: var(--text-muted);
                    }
                    .spinner {
                        width: 32px;
                        height: 32px;
                        border: 3px solid var(--border);
                        border-top-color: var(--primary);
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="modern-table-empty">
                {emptyMessage}
                <style>{`
                    .modern-table-empty {
                        padding: 60px;
                        text-align: center;
                        color: var(--text-muted);
                        font-size: 14px;
                        background: var(--bg-dark);
                        border-radius: 12px;
                        border: 1px dashed var(--border);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="modern-table-container">
            <table className="modern-table">
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, rowIdx) => (
                        <tr key={rowIdx}>
                            {columns.map((col, colIdx) => (
                                <td key={colIdx}>{col.accessor(item)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style>{`
                .modern-table-container {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 12px;
                    background: var(--bg-card);
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                .modern-table th {
                    padding: 18px 24px;
                    border-bottom: 1px solid var(--border);
                    color: var(--text-muted);
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .modern-table td {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border);
                    color: var(--text-primary);
                    font-size: 14px;
                    vertical-align: middle;
                }
                .modern-table tr:last-child td {
                    border-bottom: none;
                }
                .modern-table tr:hover td {
                    background: var(--bg-dark);
                }
            `}</style>
        </div>
    );
}

export default ModernTable;
