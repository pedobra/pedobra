import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Plus, 
    Trash2, 
    Copy, 
    Check, 
    Link as LinkIcon, 
    Save, 
    Search,
    Loader2
} from 'lucide-react';

interface CheckoutLink {
    name: string;
    url: string;
}

const MasterLinks = () => {
    const [links, setLinks] = useState<CheckoutLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copySuccess, setCopySuccess] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('master_config')
                .select('checkout_links')
                .single();

            if (error) throw error;
            if (data?.checkout_links) {
                setLinks(data.checkout_links as CheckoutLink[]);
            }
        } catch (err) {
            console.error('Erro ao buscar links:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLink = () => {
        setLinks([...links, { name: '', url: '' }]);
    };

    const handleRemoveLink = (index: number) => {
        const newLinks = [...links];
        newLinks.splice(index, 1);
        setLinks(newLinks);
    };

    const handleUpdateLink = (index: number, field: keyof CheckoutLink, value: string) => {
        const newLinks = [...links];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setLinks(newLinks);
    };

    const handleCopy = async (url: string, index: number) => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopySuccess(index);
            setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Filtrar itens vazios antes de salvar
            const filteredLinks = links.filter(l => l.name.trim() !== '' || l.url.trim() !== '');
            
            const { error } = await supabase
                .from('master_config')
                .update({ checkout_links: filteredLinks })
                .eq('id', 'e2a9ebe8-1009-48cd-92c8-65fec43364ac'); 
                // Nota: Usando o ID fixo que vimos no banco, ou idealmente o id da primeira row

            if (error) throw error;
            setLinks(filteredLinks);
            alert('Configurações de links salvas com sucesso!');
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredLinks = links.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                            <LinkIcon size={20} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>Gestão de Links</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Configure e gerencie os links de checkout e informativos para seus clientes.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text"
                            placeholder="Buscar links..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 12px 8px 36px', borderRadius: '100px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', width: '240px' }}
                        />
                    </div>
                    <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>
            </header>

            <div className="premium-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredLinks.length === 0 && searchQuery && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Nenhum link encontrado para "{searchQuery}"
                        </div>
                    )}
                    
                    {filteredLinks.map((link, index) => (
                        <div key={index} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div className="field">
                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nome do Plano</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text"
                                        value={link.name}
                                        onChange={e => handleUpdateLink(index, 'name', e.target.value)}
                                        placeholder="Ex: Plano Master Anual"
                                        style={{ width: '100%', height: '44px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-primary)', fontWeight: 600 }}
                                    />
                                    <button 
                                        onClick={handleAddLink}
                                        title="Adicionar Novo Plano"
                                        style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255,215,0,0.3)', zIndex: 10 }}
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            <div className="field">
                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Link de Checkout / Destino</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input 
                                            type="text"
                                            value={link.url}
                                            onChange={e => handleUpdateLink(index, 'url', e.target.value)}
                                            placeholder="https://pay.exemplo.com/checkout"
                                            style={{ width: '100%', height: '44px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px 0 40px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '13px' }}
                                        />
                                        <LinkIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(link.url, index)}
                                        disabled={!link.url}
                                        style={{ 
                                            height: '44px', width: '44px', borderRadius: '8px', 
                                            background: copySuccess === index ? 'var(--status-active)' : 'rgba(255,255,255,0.05)', 
                                            border: '1px solid var(--border)', color: copySuccess === index ? '#fff' : 'var(--text-primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s',
                                            flexShrink: 0
                                        }}
                                        title="Copiar Link"
                                    >
                                        {copySuccess === index ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleRemoveLink(index)}
                                style={{ height: '44px', width: '44px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                                title="Remover Link"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    {links.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border)', borderRadius: '16px' }}>
                            <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Nenhum link configurado.</div>
                            <button onClick={handleAddLink} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} /> Criar Primeiro Link
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default MasterLinks;
