import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Construction, ArrowRight } from 'lucide-react';

const LandingPage = () => {
    const [logoClicks, setLogoClicks] = useState(0);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLogin, setIsLogin] = useState(false);
    const [loading, setLoading] = useState(false);

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
        setLoading(true);
        try {
            if (showAdminModal) {
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
                        <Construction size={22} color="black" />
                    </div>
                    <span className="logo-text">PedObra</span>
                </div>
                <div className="nav-links">
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
                    <source src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/4983d633-8cdf-4c90-8e13-0177b5a30dc2.mp4" type="video/mp4" />
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
                        <button className="btn-primary" onClick={() => setIsLogin(true)}>
                            Iniciar Agora <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </main>

            {(isLogin || showAdminModal) && (
                <div className="auth-overlay glass" onClick={() => { setIsLogin(false); setShowAdminModal(false); }}>
                    <div className="auth-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="auth-header">
                            <div className="logo-icon-bg mb-4 mx-auto" style={{ width: 'fit-content' }}>
                                <Construction size={24} color="black" />
                            </div>
                            <h2 className="auth-title">
                                {showAdminModal ? 'Registro Privado Master' : 'Insira suas credenciais'}
                            </h2>
                        </div>
                        <form onSubmit={handleAuth}>
                            {showAdminModal && (
                                <div className="input-field">
                                    <label>Identificação de Administrador</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome Completo" required />
                                </div>
                            )}
                            <div className="input-field">
                                <label>E-mail</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@obra.com" required />
                            </div>
                            <div className="input-field">
                                <label>Senha</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                            </div>
                            <button className="btn-primary w-full mt-4" disabled={loading}>
                                {loading ? 'Sincronizando...' : (showAdminModal ? 'Criar Acesso Master' : 'Acessar Sistema')}
                            </button>
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
        .login-trigger { background: transparent; color: white; border: none; font-weight: 600; cursor: pointer; }
        
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
          background: radial-gradient(circle at 30% 50%, transparent 0%, rgba(0,0,0,0.8) 100%);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.2);
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
          font-weight: 800;
          text-shadow: 0 4px 30px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.5);
        }
        .text-gradient {
          background: var(--primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
        }
        .hero-desc {
          color: white;
          font-size: 1.2rem;
          line-height: 1.6;
          max-width: 600px;
          margin-bottom: 48px;
          text-shadow: 0 2px 15px rgba(0,0,0,0.9);
          font-weight: 500;
        }
        .hero-cta-group { display: flex; align-items: center; gap: 24px; }
        .trusted-by { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-muted); }
        .dot { height: 6px; width: 6px; background: var(--status-approved); border-radius: 50%; box-shadow: 0 0 10px var(--status-approved); }

        .auth-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          background: rgba(0,0,0,0.85);
        }
        .auth-card { width: 440px; padding: 48px; border: 1px solid rgba(255,215,0,0.1); }
        .auth-title { text-align: center; margin-bottom: 32px; font-size: 24px;}
        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
        .input-field input {
          width: 100%; border: 1px solid var(--border); background: var(--bg-input);
          padding: 14px; border-radius: 12px; color: white; outline: none; transition: 0.3s;
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
