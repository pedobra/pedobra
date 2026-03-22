import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    ArrowRight, 
    Check, 
    ChevronDown, 
    Construction, 
    Package, 
    LayoutDashboard, 
    ShieldCheck, 
    FileText, 
    Users,
    FileText, 
    Users,
    CheckCircle
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { detectBot } from '../lib/security';
import { maskCPF_CNPJ } from '../lib/masks';

const screenshots = [
    { url: "/assets/screenshots/dashboard.png", title: "Painel Estratégico" },
    { url: "/assets/screenshots/obras.png", title: "Gestão de Obras" },
    { url: "/assets/screenshots/pedidos.png", title: "Controle de Pedidos" },
    { url: "/assets/screenshots/materiais.png", title: "Catálogo de Insumos" },
    { url: "/assets/screenshots/fornecedores.png", title: "Gestão de Fornecedores" },
    { url: "/assets/screenshots/relatorios.png", title: "Inteligência de Dados" },
    { url: "/assets/screenshots/usuarios.png", title: "Controle de Acessos" },
    { url: "/assets/screenshots/configuracoes.png", title: "Personalização" },
    { url: "/assets/screenshots/logs.png", title: "Auditoria Completa" },
];

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
    const [honey, setHoney] = useState('');
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % screenshots.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const shouldOpenLogin = localStorage.getItem('openLogin');
        if (shouldOpenLogin === 'true') {
            setIsLogin(true);
            localStorage.removeItem('openLogin');
        }
    }, []);

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
        if (detectBot(honey)) return;
        setLoading(true);
        try {
            if (showAdminModal) {
                const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
                if (authError) throw authError;
                if (authData.user) {
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: authData.user.id, name, email, role: 'admin'
                    });
                    if (profileError) throw profileError;
                }
                alert('Admin Master Criado!');
                setShowAdminModal(false);
                setIsLogin(true);
            } else if (isSignUp) {
                const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
                if (authError) throw authError;
                if (authData.user) {
                    let userIp = '0.0.0.0';
                    try {
                        const ipRes = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipRes.json();
                        userIp = ipData.ip;
                    } catch (e) { console.error('Cant fetch IP'); }

                    const { data: isFraud } = await supabase.rpc('check_fraud_existence', { p_cpf: cpfCnpj, p_ip: userIp });
                    if (isFraud) throw new Error('Limite de teste gratuito atingido para este CPF / CNPJ.');

                    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
                    const { data: orgData, error: orgError } = await supabase.from('organizations').insert({
                        name: companyName, slug, owner_id: authData.user.id
                    }).select().single();
                    if (orgError) throw orgError;

                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: authData.user.id, name, email, role: 'admin', organization_id: orgData.id, cpf: cpfCnpj, signup_ip: userIp
                    });
                    if (profileError) throw profileError;
                    
                    localStorage.setItem('openLogin', 'true');
                    await supabase.auth.signOut();
                    alert('Conta criada com sucesso!');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const features = [
        { icon: <Package size={24} />, title: "Gestão de Pedidos", desc: "Fluxo de aprovação inteligente e histórico completo de cada solicitação." },
        { icon: <Construction size={24} />, title: "Controle de Materiais", desc: "Catálogo unificado e inventário automatizado para evitar desperdícios." },
        { icon: <LayoutDashboard size={24} />, title: "Painel Multi-obra", desc: "Gerencie múltiplos canteiros de forma centralizada e eficiente." },
        { icon: <ShieldCheck size={24} />, title: "Auditoria Completa", desc: "Rastreabilidade total: saiba quem pediu, quem aprovou e quando chegou." },
        { icon: <FileText size={24} />, title: "Geração de PDF", desc: "Relatórios profissionais e ordens de compra prontos para envio ou impressão." },
        { icon: <Users size={24} />, title: "Controle de Equipes", desc: "Níveis de acesso personalizados para mestres de obra e gestores." },
    ];

    const faqs = [
        { q: "O sistema funciona em celular?", a: "Sim! O PedObra é totalmente responsivo e foi desenhado para funcionar perfeitamente em smartphones, tablets e computadores." },
        { q: "Como funciona o período de teste de 7 dias?", a: "Ao se cadastrar, você ganha acesso total a todas as funcionalidades do plano Professional por 7 dias. Nenhuma cobrança é feita durante este período." },
        { q: "Posso exportar meus dados para PDF?", a: "Com certeza. Todos os pedidos, materiais e históricos podem ser exportados em PDFs profissionais com um clique." },
        { q: "O suporte está incluso nos planos?", a: "Sim, oferecemos suporte premium via WhatsApp e e-mail para todos os nossos parceiros." },
        { q: "Quantas obras posso gerenciar?", a: "Oferecemos planos flexíveis que atendem desde o pequeno construtor (1 obra) até grandes incorporadoras (obras ilimitadas)." },
        { q: "Posso cancelar a assinatura quando quiser?", a: "Sim, não trabalhamos com contratos de fidelidade. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel." },
    ];

    return (
        <div className="landing-wrapper">
            <nav className="lp-nav glass">
                <div className="nav-container-limit">
                    <div className="lp-logo" onClick={handleLogoClick}>
                        <img src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" alt="PedObra" />
                    </div>
                    <div className="nav-right">
                        <ThemeToggle />
                        <button className="nav-login-btn" onClick={() => setIsLogin(true)}>Entrar</button>
                        <button className="nav-cta-btn highlight-glow" onClick={() => setIsSignUp(true)}>Começar Grátis</button>
                    </div>
                </div>
            </nav>

            <header className="hero-section text-center">
                <div className="section-container">
                    <div className="hero-badge animate-fade">INOVAÇÃO & TECNOLOGIA</div>
                    <h1 className="hero-title animate-fade">
                        Pare de perder dinheiro na obra <br />
                        por <span className="text-glow highlight-accent">falta de controle.</span>
                    </h1>
                    <p className="hero-subtitle mx-auto animate-fade">
                        Gerencie pedidos de materiais em tempo real com um sistema simples, rápido e feito para quem está na obra.
                    </p>
                    <div className="hero-actions justify-center animate-fade">
                        <button className="btn-main highlight-glow" onClick={() => setIsSignUp(true)}>
                            Iniciar Teste Grátis <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <section id="venda-mockup" className="venda-section">
                <div className="section-container">
                    <div className="venda-grid">
                        <div className="venda-content animate-fade">
                            <h2 className="venda-title">Controle absoluto da sua obra, em tempo real</h2>
                            <p className="venda-subtitle">
                                Tudo que acontece no seu canteiro, na palma da sua mão. Sem achismo. Sem atraso. Sem prejuízo.
                            </p>
                            <ul className="venda-bullets">
                                <li><CheckCircle size={20} className="bullet-icon" /> Acompanhe pedidos em tempo real</li>
                                <li><CheckCircle size={20} className="bullet-icon" /> Controle materiais e custos</li>
                                <li><CheckCircle size={20} className="bullet-icon" /> Evite erros e desperdícios</li>
                            </ul>
                            <div className="venda-actions">
                                <button className="btn-venda highlight-glow" onClick={() => setIsSignUp(true)}>
                                    👉 Testar agora
                                </button>
                            </div>
                        </div>

                        <div className="venda-mockup-area animate-fade">
                            <div className="mockup-parallax-layer">
                                <div className="mockup-floating-card glass-heavy">
                                    <div className="mockup-screen-header">
                                        <div className="dots"><span></span><span></span><span></span></div>
                                    </div>
                                    <img 
                                        src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/screenshots/pedidos_lista.png" 
                                        alt="Sistema PedObra" 
                                        className="mockup-img"
                                    />
                                    <div className="floating-element card-stats glass animate-float-slow">
                                        <div className="stat-label">Economia mensal</div>
                                        <div className="stat-value">+R$ 12.450</div>
                                    </div>
                                    <div className="floating-element card-alert glass animate-float-fast">
                                        <div className="stat-label">Material pendente</div>
                                        <div className="stat-value">Cimento CP-II</div>
                                    </div>
                                </div>
                                <div className="mockup-glow-effect"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="steps-section">
                <div className="section-container">
                    <h2 className="section-title text-center">Fluxo Inteligente em 3 Etapas</h2>
                    <div className="steps-grid">
                        {[
                            { step: "01", title: "Configuração Rápida", desc: "Cadastre suas obras e convide sua equipe em minutos." },
                            { step: "02", title: "Pedidos de Campo", desc: "Mestres de obra solicitam insumos direto pelo celular." },
                            { step: "03", title: "Aprovação & Controle", desc: "Aprove compras e monitore o orçamento em tempo real." }
                        ].map((s, i) => (
                            <div key={i} className="step-card glass">
                                <span className="step-num">{s.step}</span>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="features-section">
                <div className="section-container">
                    <h2 className="section-title">Tecnologia para resultados reais</h2>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card glass-hover">
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="plans-section">
                <div className="section-container">
                    <h2 className="section-title text-center">Planos Transparentes</h2>
                    <div className="plans-grid">
                        {[
                            { name: "Starter", price: "79", features: ["1 Obra Ativa", "Gestão de Pedidos", "App do Operário", "Suporte E-mail"] },
                            { name: "Profissional", price: "147", highlight: true, features: ["Obras Ilimitadas", "Relatórios Interativos", "Geração de PDF", "Suporte WhatsApp"] },
                            { name: "Empresarial", price: "Custom", features: ["Multi-Empresa", "API de Integração", "SLA Dedicado", "Gestor de Contas"] }
                        ].map((p, i) => (
                            <div key={i} className={`plan-card glass ${p.highlight ? 'plan-highlight' : ''}`}>
                                <h3 className="plan-name">{p.name}</h3>
                                <div className="plan-price">
                                    {p.price !== 'Custom' && <span className="currency">R$</span>}
                                    <span className="price-val">{p.price}</span>
                                    {p.price !== 'Custom' && <span className="period">/mês</span>}
                                </div>
                                <ul className="plan-features">
                                    {p.features.map((f, fi) => <li key={fi}><Check size={16} color="var(--primary)" /> {f}</li>)}
                                </ul>
                                <button className={`plan-btn ${p.highlight ? 'highlight-glow' : ''}`} onClick={() => setIsSignUp(true)}>Começar Agora</button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="faq-section">
                <div className="section-container-small">
                    <h2 className="section-title text-center">FAQ</h2>
                    <div className="faq-accordion">
                        {faqs.map((f, i) => (
                            <div key={i} className={`faq-item glass ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                                <div className="faq-header">
                                    <span>{f.q}</span>
                                    <ChevronDown size={18} className="faq-arrow" />
                                </div>
                                {activeFaq === i && <div className="faq-body animate-fade"><p>{f.a}</p></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="lp-footer">
                <div className="footer-container">
                    <div className="footer-top">
                        <div className="footer-brand">
                            <img src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" alt="Logo" />
                            <p>Gestão de obras inteligente.</p>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2026 PedObra. Todos os direitos reservados.</p>
                        <div className="footer-socials">SSL 256 bits</div>
                    </div>
                </div>
            </footer>

            {(isLogin || isSignUp || showAdminModal) && (
                <div className="auth-overlay glass-heavy" onClick={() => { setIsLogin(false); setIsSignUp(false); setShowAdminModal(false); }}>
                    <div className="auth-card premium-card animate-fade" onClick={e => e.stopPropagation()}>
                        <div className="auth-header text-center">
                            <img src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" alt="Logo" className="auth-logo" />
                            <h2 className="auth-title">
                                {showAdminModal ? 'Acesso Master' : isSignUp ? 'Criar sua conta' : 'Entrar no sistema'}
                            </h2>
                        </div>
                        <form onSubmit={handleAuth}>
                            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" value={honey} onChange={e => setHoney(e.target.value)} name="website_url" aria-hidden="true" />
                            {(showAdminModal || isSignUp) && (
                                <div className="input-field">
                                    <label>Seu Nome</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" required />
                                </div>
                            )}
                            {isSignUp && (
                                <>
                                    <div className="input-field">
                                        <label>Empresa</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nome da sua empresa" required />
                                    </div>
                                    <div className="input-field">
                                        <label>CPF ou CNPJ</label>
                                        <input type="text" value={cpfCnpj} onChange={e => setCpfCnpj(maskCPF_CNPJ(e.target.value))} placeholder="000.000.000-00" required />
                                    </div>
                                </>
                            )}
                            <div className="input-field">
                                <label>E-mail</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail profissional" required />
                            </div>
                            <div className="input-field">
                                <label>Senha</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha segura" required />
                            </div>
                            <button className="btn-main highlight-glow w-full mt-4" disabled={loading}>
                                {loading ? 'Aguarde...' : (showAdminModal ? 'Criar Admin' : isSignUp ? 'Criar Conta' : 'Fazer Login')}
                            </button>
                            {!showAdminModal && (
                                <div className="auth-switch">
                                    {isLogin ? (
                                        <p>Novo por aqui? <button type="button" onClick={() => { setIsLogin(false); setIsSignUp(true); }}>Criar conta grátis</button></p>
                                    ) : (
                                        <p>Já tem conta? <button type="button" onClick={() => { setIsSignUp(false); setIsLogin(true); }}>Entrar agora</button></p>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                :root {
                    --bg-onyx: #171614;
                    --alabaster: #eaeaea;
                    --primary: #eaeaea;
                    --text-main: #eaeaea;
                    --text-soft: rgba(234, 234, 234, 0.6);
                    --border: rgba(234, 234, 234, 0.1);
                    --glass: rgba(234, 234, 234, 0.03);
                }

                .landing-wrapper { background: var(--bg-onyx); color: var(--text-main); min-height: 100vh; font-family: 'Inter', sans-serif; overflow-x: hidden; }
                .section-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
                .section-container-small { max-width: 800px; margin: 0 auto; padding: 0 24px; }
                .text-center { text-align: center; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .justify-center { justify-content: center; }
                .w-full { width: 100%; }
                .mt-4 { margin-top: 16px; }

                .lp-nav { position: fixed; top: 0; left: 0; right: 0; height: 80px; z-index: 1000; border-bottom: 1px solid var(--border); }
                .nav-container-limit { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
                .lp-logo { height: 32px; cursor: pointer; }
                .lp-logo img { height: 100%; }
                .nav-right { display: flex; align-items: center; gap: 24px; }
                .nav-login-btn { background: none; border: none; color: var(--text-main); font-weight: 600; cursor: pointer; }
                .nav-cta-btn { background: var(--alabaster); color: var(--bg-onyx); padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; }

                .hero-section { 
                    padding: 180px 0 100px;
                    background-image: linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('/assets/pedobra_hero_v4.png');
                    background-attachment: fixed;
                    background-size: cover;
                    background-position: center;
                }
                /* Venda Section v6.0 */
                .venda-section { padding: 120px 0; background: linear-gradient(180deg, #171614 0%, #000 100%); overflow: hidden; }
                .venda-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 80px; align-items: center; }
                .venda-title { 
                    font-size: clamp(32px, 4vw, 56px); 
                    font-weight: 900; 
                    line-height: 1.1; 
                    margin-bottom: 24px; 
                    letter-spacing: -1px;
                }
                .venda-subtitle { 
                    font-size: 18px; 
                    color: var(--text-soft); 
                    margin-bottom: 40px; 
                    line-height: 1.6; 
                    max-width: 500px;
                }
                .venda-bullets { list-style: none; padding: 0; margin-bottom: 48px; }
                .venda-bullets li { 
                    display: flex; 
                    align-items: center; 
                    gap: 16px; 
                    font-size: 16px; 
                    font-weight: 600; 
                    margin-bottom: 20px; 
                    color: var(--alabaster);
                }
                .bullet-icon { color: #fff; filter: drop-shadow(0 0 10px rgba(255,255,255,0.4)); }
                
                .btn-venda { 
                    background: #fff; 
                    color: #000; 
                    padding: 20px 44px; 
                    border-radius: 12px; 
                    font-weight: 850; 
                    font-size: 18px; 
                    border: none; 
                    cursor: pointer;
                    transition: 0.3s;
                }
                .btn-venda:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(255,255,255,0.2); }

                .venda-mockup-area { position: relative; perspective: 2000px; }
                .mockup-parallax-layer { 
                    position: relative; 
                    transform-style: preserve-3d;
                    transform: rotateY(-15deg) rotateX(10deg);
                    transition: transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                .mockup-parallax-layer:hover { transform: rotateY(-5deg) rotateX(5deg) scale(1.02); }
                
                .mockup-floating-card { 
                    position: relative;
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.15);
                    box-shadow: 
                        -50px 50px 100px rgba(0,0,0,0.8),
                        0 0 60px rgba(255,255,255,0.05);
                    overflow: hidden;
                    background: #111;
                }
                .mockup-screen-header { 
                    height: 40px; 
                    padding: 0 20px; 
                    display: flex; 
                    align-items: center; 
                    background: rgba(255,255,255,0.05);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .mockup-screen-header .dots { display: flex; gap: 8px; }
                .mockup-screen-header .dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }
                .mockup-img { width: 100%; display: block; filter: contrast(1.1); }
                
                .floating-element {
                    position: absolute;
                    padding: 16px 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(20px);
                    z-index: 10;
                    box-shadow: 20px 20px 40px rgba(0,0,0,0.4);
                }
                .card-stats { bottom: 60px; left: -40px; transform: translateZ(50px); }
                .card-alert { top: 60px; right: -30px; transform: translateZ(80px); }
                .stat-label { font-size: 11px; font-weight: 800; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                .stat-value { font-size: 18px; font-weight: 900; color: #fff; }

                .animate-float-slow { animation: float 6s ease-in-out infinite; }
                .animate-float-fast { animation: float 4s ease-in-out infinite reverse; }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateZ(50px); }
                    50% { transform: translateY(-20px) translateZ(50px); }
                }

                @media (max-width: 1024px) {
                    .venda-grid { grid-template-columns: 1fr; gap: 60px; text-align: center; }
                    .venda-content { display: flex; flex-direction: column; align-items: center; }
                    .venda-mockup-area { padding: 0 40px; margin-top: 40px; }
                    .mockup-parallax-layer { transform: rotateY(0) rotateX(0); }
                    .card-stats, .card-alert { display: none; }
                }
                @media (max-width: 640px) {
                    .venda-mockup-area { padding: 0 10px; }
                    .mockup-floating-card { border-radius: 16px; }
                }

                .hero-badge { font-size: 12px; font-weight: 800; opacity: 0.5; letter-spacing: 2px; margin-bottom: 24px; }
                .hero-title { 
                    font-size: clamp(40px, 8vw, 84px); 
                    font-weight: 900; 
                    line-height: 1.1; 
                    letter-spacing: -3px; 
                    margin-bottom: 32px;
                    text-shadow: 0 4px 15px rgba(0,0,0,0.8); /* Sombra em toda a headline */
                }
                .text-glow { color: #fff; text-shadow: 0 0 40px rgba(255,255,255,0.3); }
                .highlight-accent { color: var(--alabaster); text-shadow: 0 0 30px rgba(234, 234, 234, 0.4); }
                .hero-subtitle { font-size: 20px; color: var(--text-soft); max-width: 600px; margin-bottom: 48px; line-height: 1.6; }
                .hero-actions { display: flex; gap: 16px; }
                .btn-main { background: var(--alabaster); color: var(--bg-onyx); padding: 18px 36px; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 12px; }
                .highlight-glow { box-shadow: 0 0 50px rgba(255,255,255,0.1); }

                /* Simplified Carousel Elite */
                .screenshots-carousel-section { padding-bottom: 120px; }
                .carousel-main-container { 
                    position: relative; 
                    max-width: 1000px; 
                    margin: 0 auto; 
                    border-radius: 20px; 
                    padding: 4px; 
                    overflow: hidden;
                    border: 1px solid rgba(234, 234, 234, 0.4); /* Borda neon discreta */
                    box-shadow: 0 0 30px rgba(234, 234, 234, 0.15); /* Glow neon */
                }
                .carousel-view-area { 
                    position: relative; 
                    width: 100%; 
                    aspect-ratio: 16 / 9; /* Mantém proporção padrão desktop */
                    background: #1e1e21; 
                    overflow: hidden; 
                    border-radius: 16px;
                }
                .carousel-wrapper { 
                    display: flex; 
                    width: 100%; 
                    height: 100%; 
                    transition: transform 0.8s cubic-bezier(0.65, 0, 0.35, 1);
                }
                .carousel-item { 
                    min-width: 100%; 
                    height: 100%; 
                    position: relative; 
                    background: #fff; /* Fundo branco para não ter contraste negativo nos prints */
                }
                .screen-content { 
                    width: 100%; 
                    height: 100%; 
                    object-fit: contain; /* GARANTE QUE A IMAGEM INTEIRA APAREÇA */
                    display: block;
                }
                .screenshot-watermark { 
                    position: absolute; 
                    inset: 0; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    pointer-events: none; 
                    opacity: 0.15;
                    transform: rotate(-15deg);
                }
                .screenshot-watermark img { width: 300px; filter: grayscale(1) contrast(1.2); }
                .carousel-controls { 
                    position: absolute; 
                    top: 50%; 
                    left: 0; 
                    right: 0; 
                    transform: translateY(-50%); 
                    display: flex; 
                    justify-content: space-between; 
                    padding: 0 20px; 
                }
                .control-btn { background: rgba(0,0,0,0.5); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; z-index: 10; }
                .control-btn:hover { background: rgba(0,0,0,0.8); transform: scale(1.1); }
                .slide-indicator { position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; color: #000; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(234, 234, 234, 0.7); display: inline-block; width: fit-content; margin: 0 auto; padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.1); }

                .section-title { font-size: 36px; font-weight: 850; margin-bottom: 60px; letter-spacing: -1px; }
                .steps-section { padding: 100px 0; background: rgba(255,255,255,0.01); }
                .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .step-card { padding: 40px; border-radius: 20px; text-align: left; }
                .step-num { font-size: 12px; font-weight: 900; opacity: 0.3; margin-bottom: 20px; display: block; }
                .step-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
                .step-card p { font-size: 14px; color: var(--text-soft); line-height: 1.6; }

                .features-section { padding: 120px 0; }
                .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .feature-card { padding: 32px; border-radius: 16px; border: 1px solid var(--border); transition: 0.3s; }
                .feature-icon { margin-bottom: 24px; color: var(--alabaster); opacity: 0.8; }
                .glass-hover:hover { background: var(--glass); transform: translateY(-4px); }

                .plans-section { padding: 100px 0; background: rgba(0,0,0,0.2); }
                .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .plan-card { padding: 40px; border-radius: 24px; text-align: center; }
                .plan-highlight { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.02); }
                .plan-name { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
                .plan-price { font-size: 40px; font-weight: 900; margin-bottom: 32px; }
                .plan-features { list-style: none; padding: 0; margin-bottom: 40px; text-align: left; }
                .plan-features li { display: flex; align-items: center; gap: 12px; font-size: 14px; margin-bottom: 12px; color: var(--text-soft); }
                .plan-btn { width: 100%; padding: 14px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.3s; background: var(--glass); color: #fff; border: 1px solid var(--border); }
                .plan-btn.highlight-glow { background: #fff; color: #000; border: none; }

                .faq-section { padding: 100px 0; }
                .faq-accordion { display: flex; flex-direction: column; gap: 12px; }
                .faq-item { border-radius: 12px; cursor: pointer; }
                .faq-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
                .faq-body { padding: 0 24px 20px; color: var(--text-soft); font-size: 14px; }
                .faq-arrow { transition: 0.3s; }
                .active .faq-arrow { transform: rotate(180deg); }

                .lp-footer { padding: 80px 40px 40px; border-top: 1px solid var(--border); }
                .footer-brand img { height: 28px; margin-bottom: 16px; }
                .footer-brand p { font-size: 14px; color: var(--text-soft); }
                .footer-bottom { margin-top: 60px; padding-top: 32px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 12px; color: var(--text-soft); }

                .auth-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 24px; }
                .auth-card { width: 100%; max-width: 400px; padding: 40px; border-radius: 24px; background: #1a1a1c; border: 1px solid var(--border); position: relative; z-index: 2001; }
                .auth-logo { height: 32px; margin: 0 auto 24px; display: block; }
                .input-field { margin-bottom: 16px; text-align: left; }
                .input-field label { font-size: 11px; font-weight: 800; color: var(--text-soft); margin-bottom: 6px; display: block; text-transform: uppercase; }
                .input-field input { width: 100%; padding: 12px; border-radius: 8px; background: #0c0c0d; border: 1px solid var(--border); color: #fff; outline: none; }
                .auth-switch { margin-top: 24px; font-size: 14px; color: var(--text-soft); }
                .auth-switch button { background: none; border: none; color: #fff; font-weight: 700; cursor: pointer; border-bottom: 1px solid #fff; margin-left: 4px; }

                @media (max-width: 1024px) {
                    .hero-title { font-size: 48px; }
                    .steps-grid, .features-grid, .plans-grid { grid-template-columns: 1fr; }
                    .mockup-container { border-radius: 16px; }
                }

                .animate-fade { animation: fadeIn 0.8s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .glass { background: var(--glass); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
                .glass-heavy { background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
            `}</style>
        </div>
    );
};

export default LandingPage;
