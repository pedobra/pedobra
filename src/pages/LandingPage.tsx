import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Construction, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { detectBot } from '../lib/security';
import { maskCPF_CNPJ } from '../lib/masks';

const LandingPage = () => {
    const [logoClicks, setLogoClicks] = useState(0);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [isLogin, setIsLogin] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [honey, setHoney] = useState(''); // Honeypot state

    const handleLogoClick = () => {
        const newClicks = logoClicks + 1;
        setLogoClicks(newClicks);
        if (newClicks >= 5) {
            setShowAdminModal(true);
            setLogoClicks(0);
        }
        setTimeout(() => setLogoClicks(0), 3000);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // [SEGURANÇA] Bloqueio silencioso de Bots via Honeypot
        if (detectBot(honey)) return;

        setLoading(true);
        try {
            if (showAdminModal) {
                // ... (Hidden Admin Logic - Existing)
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;

                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: authData.user.id,
                            name,
                            email,
                            role: 'admin'
                        });
                    if (profileError) throw profileError;
                }
                alert('Admin Master Criado! Agora faça o login.');
                setShowAdminModal(false);
                setIsLogin(true);
            } else if (isSignUp) {
                // SAAS Public SignUp Logic
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;

                if (authData.user) {
                    // 0. Fraud Prevention & IP Fetch
                    let userIp = '0.0.0.0';
                    try {
                        const ipRes = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipRes.json();
                        userIp = ipData.ip;
                    } catch (e) {
                        console.error('Cant fetch IP');
                    }

                    // Check if CPF or IP already exists using RPC (Security Definer)
                    const { data: isFraud } = await supabase.rpc('check_fraud_existence', { 
                        p_cpf: cpfCnpj, 
                        p_ip: userIp 
                    });
                    
                    if (isFraud) {
                        // If fraud detected, we should ideally delete the auth user, but for now we just block
                        throw new Error('Limite de teste gratuito atingido para este CPF ou conexão de internet.');
                    }

                    // 1. Create Organization
                    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
                    const { data: orgData, error: orgError } = await supabase
                        .from('organizations')
                        .insert({
                            name: companyName,
                            slug,
                            owner_id: authData.user.id
                        })
                        .select()
                        .single();
                    
                    if (orgError) throw orgError;

                    // 2. Create Profile linked to Org
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: authData.user.id,
                            name,
                            email,
                            role: 'admin',
                            organization_id: orgData.id,
                            cpf: cpfCnpj,
                            signup_ip: userIp
                        });
                    if (profileError) throw profileError;
                    
                    alert('Conta criada com sucesso! Você iniciou seu teste grátis de 7 dias.');
                    setIsSignUp(false);
                    setIsLogin(true);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="landing-page">
            <nav className="navbar animate-fade">
                <div className="logo-wrapper" onClick={handleLogoClick}>
                    <div className="logo-icon-bg">
                        <Construction size={22} color="var(--bg-dark)" />
                    </div>
                    <span className="logo-text">PedObra</span>
                </div>
                <div className="nav-links">
                    <ThemeToggle />
                    <button className="login-trigger" onClick={() => setIsLogin(true)}>Entrar</button>
                </div>
            </nav>

            <div className="hero-background-wrapper">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="hero-background-video"
                >
                    <source src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/019240b0-d26f-458d-bad5-6e4ad87376a6.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay-master"></div>
            </div>

            <main className="hero-grid">
                <div className="hero-text-content animate-fade">
                    <h1 className="hero-title">
                        Onde a Engenharia <br />
                        Encontra a <span className="text-gradient">Excelência.</span>
                    </h1>
                    <p className="hero-desc">
                        PedObra é a plataforma premium que transforma a complexidade do canteiro de obras em uma experiência fluida e inteligente.
                    </p>
                    <div className="hero-cta-group">
                        <button className="btn-primary" onClick={() => setIsSignUp(true)}>
                            Iniciar 7 Dias Grátis <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </main>

            {(isLogin || isSignUp || showAdminModal) && (
                <div className="auth-overlay glass" onClick={() => { setIsLogin(false); setIsSignUp(false); setShowAdminModal(false); }}>
                    <div className="auth-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="auth-header">
                            <div className="logo-icon-bg mb-4 mx-auto" style={{ width: 'fit-content' }}>
                                <Construction size={24} color="var(--bg-dark)" />
                            </div>
                            <h2 className="auth-title">
                                {showAdminModal ? 'Registro Privado Master' : 
                                 isSignUp ? 'Crie sua conta PedObra' : 'Insira suas credenciais'}
                            </h2>
                        </div>
                        <form onSubmit={handleAuth}>
                            {/* [SEGURANÇA] HONEYPOT INVISÍVEL */}
                            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" value={honey} onChange={e => setHoney(e.target.value)} name="website_url" aria-hidden="true" />
                            
                            {(showAdminModal || isSignUp) && (
                                <div className="input-field">
                                    <label>Seu Nome Completo</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Engenheiro Roberto" required />
                                </div>
                            )}
                            {isSignUp && (
                                <>
                                    <div className="input-field">
                                        <label>Nome da Empresa / Construtora</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Roberto Construções Ltda" required />
                                    </div>
                                    <div className="input-field">
                                        <label>CPF ou CNPJ</label>
                                        <input type="text" value={cpfCnpj} onChange={e => setCpfCnpj(maskCPF_CNPJ(e.target.value))} placeholder="000.000.000-00" required />
                                    </div>
                                </>
                            )}
                            <div className="input-field">
                                <label>E-mail Corporativo</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@obra.com" required />
                            </div>
                            <div className="input-field">
                                <label>Senha</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                            </div>
                            <button className="btn-primary w-full mt-4" disabled={loading}>
                                {loading ? 'Processando...' : (
                                    showAdminModal ? 'Criar Acesso Master' : 
                                    isSignUp ? 'Iniciar Teste Grátis' : 'Acessar Sistema'
                                )}
                            </button>
                            
                            {!showAdminModal && (
                                <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
                                    {isLogin ? (
                                        <p>Ainda não tem conta? <button type="button" onClick={() => { setIsLogin(false); setIsSignUp(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>Experimente Grátis</button></p>
                                    ) : (
                                        <p>Já possui cadastro? <button type="button" onClick={() => { setIsSignUp(false); setIsLogin(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>Fazer Login</button></p>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .landing-page {
          background: var(--bg-dark);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .navbar {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 80px;
          position: relative;
          z-index: 10;
        }
        .logo-wrapper { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .logo-icon-bg { background: var(--primary); padding: 8px; border-radius: 10px; display: flex; }
        .logo-text { font-size: 26px; font-weight: 800; }
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .login-trigger { background: transparent; color: var(--text-primary); border: none; font-weight: 600; cursor: pointer; }
        
        .hero-grid {
          position: relative;
          z-index: 5;
          max-width: 1400px;
          margin: 0 auto;
          min-height: calc(100vh - 100px);
          display: flex;
          align-items: center;
          padding: 0 80px;
        }
        
        .hero-background-wrapper {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          z-index: 1;
        }
        .hero-background-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.4);
        }
        .video-overlay-master {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.9) 100%);
        }
        [data-theme="dark"] .video-overlay-master {
          background: radial-gradient(circle at 30% 50%, transparent 0%, rgba(0,0,0,0.8) 100%);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-glow);
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: clamp(40px, 8vw, 84px);
          line-height: 1.1;
          margin-bottom: 32px;
          color: var(--text-primary);
          font-weight: 800;
        }
        .text-gradient {
          background: var(--primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
        }
        .hero-desc {
          color: var(--text-primary);
          font-size: 1.2rem;
          line-height: 1.6;
          max-width: 600px;
          margin-bottom: 48px;
          font-weight: 500;
        }
        .hero-cta-group { display: flex; align-items: center; gap: 24px; }
        .trusted-by { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-muted); }
        .dot { height: 6px; width: 6px; background: var(--status-approved); border-radius: 50%; box-shadow: 0 0 10px var(--status-approved); }

        .auth-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: flex-start; justify-content: center;
          z-index: 1000;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          overflow-y: auto;
          padding: 40px 20px;
        }
        .auth-card { 
          width: 440px; 
          padding: 48px; 
          border: 1px solid var(--border); 
          background: var(--bg-card);
          margin: auto 0;
        }
        .auth-title { text-align: center; margin-bottom: 32px; font-size: 24px; color: var(--text-primary); }
        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
        .input-field input {
          width: 100%; border: 1px solid var(--border); background: var(--bg-input);
          padding: 14px; border-radius: 12px; color: var(--text-primary); outline: none; transition: 0.3s;
        }
        .input-field input:focus { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }
        .w-full { width: 100%; }
        .mt-4 { margin-top: 16px; }
        .mb-4 { margin-bottom: 16px; }
        .mx-auto { margin-left: auto; margin-right: auto; }

        @media (max-width: 1024px) {
           .navbar { padding: 0 40px; }
           .hero-grid { padding: 0 40px; }
           .hero-title { font-size: 60px; }
        }

        @media (max-width: 768px) {
           .navbar { padding: 0 24px; height: 64px; }
           .logo-text { font-size: 20px; }
           .nav-links { gap: 16px; }

           /* Hero: altura adaptada ao conteúdo */
           .landing-page { min-height: 100svh; }
           .hero-background-wrapper { height: 100svh; position: fixed; }
           .hero-grid {
               padding: 0 20px;
               text-align: center;
               justify-content: center;
               min-height: calc(100svh - 64px);
               padding-top: 0;
               padding-bottom: 24px;
           }
           .hero-text-content { display: flex; flex-direction: column; align-items: center; }
           .hero-title { font-size: 36px; line-height: 1.15; margin-bottom: 20px; }
           .hero-desc { font-size: 0.95rem; margin-bottom: 36px; max-width: 100%; }
           .hero-cta-group { flex-direction: column; width: 100%; }
           .btn-primary { width: 100%; justify-content: center; }

           /* Vídeo: melhor enquadramento em portrait */
           .hero-background-video {
               object-fit: cover;
               object-position: center center;
               width: 100%;
               height: 100%;
           }
           .video-overlay-master {
               background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.95) 80%);
           }
           [data-theme="dark"] .video-overlay-master {
               background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.85) 80%);
           }

           /* Auth card adaptado */
           .auth-card { width: 92vw; padding: 32px 24px; }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
