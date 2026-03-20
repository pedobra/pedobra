import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Shield, CreditCard, Send, Power } from 'lucide-react';

interface OrganizationManageModalProps {
    organization: any;
    onClose: () => void;
    onUpdate: () => void;
}

const OrganizationManageModal = ({ organization, onClose, onUpdate }: OrganizationManageModalProps) => {
    const [planId, setPlanId] = useState(organization.plan_id || 'trial');
    const [status, setStatus] = useState(organization.subscription_status || 'trialing');
    const [message, setMessage] = useState(organization.system_message || '');
    const [messageLevel, setMessageLevel] = useState(organization.system_message_level || 'info');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    plan_id: planId,
                    subscription_status: status,
                    system_message: message,
                    system_message_level: messageLevel,
                    trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', organization.id);

            if (error) throw error;
            alert('Organização atualizada com sucesso!');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(`Erro ao atualizar organização: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div className="modal-content-saas animate-scale-up" style={{ width: '500px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <header style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Gerenciar Cliente</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{organization.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn-ghost"><X size={20} /></button>
                </header>

                <div style={{ padding: '24px', display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    
                    {/* PLAN SELECTION */}
                    <div className="input-field-saas">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                            <CreditCard size={14} /> Plano de Assinatura
                        </label>
                        <select 
                            value={planId} 
                            onChange={(e) => setPlanId(e.target.value)}
                            style={{ width: '100%', height: '44px', background: 'var(--bg-dark)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            <option value="trial">Trial (Período de Teste)</option>
                            <option value="basic">Básico (R$ 147)</option>
                            <option value="pro">Profissional (R$ 297)</option>
                        </select>
                    </div>

                    {/* STATUS SELECTION */}
                    <div className="input-field-saas">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                            <Power size={14} /> Status da Assinatura
                        </label>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)}
                            style={{ width: '100%', height: '44px', background: 'var(--bg-dark)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            <option value="trialing">Trialing (Em Teste)</option>
                            <option value="active">Active (Ativo)</option>
                            <option value="past_due">Past Due (Atrasado)</option>
                            <option value="suspended">Suspended (Suspenso)</option>
                            <option value="canceled">Canceled (Cancelado)</option>
                        </select>
                    </div>

                    {/* DIRECT MESSAGE */}
                    <div className="input-field-saas">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                            <Send size={14} /> Aviso Direto no Dashboard
                        </label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escreva um aviso para o cliente ver ao abrir o sistema..."
                            style={{ width: '100%', minHeight: '80px', background: 'var(--bg-dark)', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            {['info', 'warning', 'error'].map(level => (
                                <button 
                                    key={level}
                                    onClick={() => setMessageLevel(level)}
                                    style={{ 
                                        flex: 1, height: '32px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1.5px solid var(--border)',
                                        background: messageLevel === level ? 
                                            (level === 'info' ? 'rgba(59,130,246,0.1)' : level === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent',
                                        color: messageLevel === level ?
                                            (level === 'info' ? '#3b82f6' : level === 'warning' ? '#f59e0b' : '#ef4444') : 'var(--text-muted)',
                                        borderColor: messageLevel === level ?
                                            (level === 'info' ? '#3b82f6' : level === 'warning' ? '#f59e0b' : '#ef4444') : 'var(--border)'
                                    }}
                                >
                                    {level.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <footer style={{ padding: '20px 24px', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '0 20px', height: '40px' }}>Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        className="btn-primary" 
                        disabled={saving}
                        style={{ padding: '0 24px', height: '40px', background: 'var(--primary)', color: 'white', fontWeight: 700, borderRadius: '8px' }}
                    >
                        {saving ? 'Gravando...' : 'Salvar Alterações'}
                    </button>
                </footer>
            </div>
            
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scale-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                .icon-btn-ghost { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: 0.2s; }
                .icon-btn-ghost:hover { background: var(--bg-card); color: var(--text-primary); }
            `}</style>
        </div>
    );
};

export default OrganizationManageModal;
