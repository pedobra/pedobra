import React from 'react';

interface ModernTableProps {
    headers: string[];
    children: React.ReactNode;
}

const ModernTable: React.FC<ModernTableProps> = ({ headers, children }) => {
    return (
        <div className="modern-table-container">
            <table className="modern-table">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {children}
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
};

export default ModernTable;
