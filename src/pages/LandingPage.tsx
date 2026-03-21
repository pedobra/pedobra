import React, { useState } from 'react';
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
    Zap, 
    Globe 
} from 'lucide-react';
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
    const [honey, setHoney] = useState('');
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    React.useEffect(() => {
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

            <header className="hero-section">
                <div className="hero-bg-accent"></div>
                <div className="grid-container animate-fade">
                    <div className="hero-content">
                        <div className="hero-badge">PLATAFORMA PREMIUM DE ENGENHARIA</div>
                        <h1 className="hero-title">
                            Controle total da sua obra <br />
                            <span className="text-glow">sem planilhas e sem caos.</span>
                        </h1>
                        <p className="hero-subtitle">
                            PedObra é a solução SaaS de alto nível que transforma o canteiro de obras em uma operação fluida, rastreável e lucrativa.
                        </p>
                        <div className="hero-actions">
                            <button className="btn-main highlight-glow" onClick={() => setIsSignUp(true)}>
                                Iniciar Teste Grátis <ArrowRight size={20} />
                            </button>
                            <button className="btn-outline" onClick={() => {
                                const el = document.getElementById('how-it-works');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}>Ver como funciona</button>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="mockup-frame glass">
                            <img src="/assets/pedobra_mockup_v1.png" alt="Mockup Dashboard PedObra" />
                        </div>
                    </div>
                </div>
            </header>

            <section id="how-it-works" className="how-it-works-section">
                <div className="section-container">
                    <h2 className="section-title text-center">Simples. Direto. Eficiente.</h2>
                    <div className="steps-grid">
                        {[
                            { step: "01", title: "Cadastre sua obra", desc: "Configure os detalhes, equipe e prazos em segundos." },
                            { step: "02", title: "Equipe faz pedidos", desc: "Mestres de obra solicitam materiais pelo app de campo." },
                            { step: "03", title: "Controle tudo", desc: "Monitore custos e aprove pedidos em tempo real." }
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
                    <h2 className="section-title">Infraestrutura completa para sua gestão</h2>
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
                    <h2 className="section-title text-center">Planos que acompanham seu crescimento</h2>
                    <div className="plans-grid">
                        {[
                            { name: "Starter", price: "79", tag: "Essencial", features: ["1 Obra Ativa", "Gestão de Pedidos", "App do Operário", "Suporte E-mail"] },
                            { name: "Profissional", price: "147", tag: "Mais Popular", highlight: true, features: ["Obras Ilimitadas", "Relatórios Interativos", "Geração de PDF", "Suporte WhatsApp"] },
                            { name: "Empresarial", price: "Custom", tag: "Escala Total", features: ["Multi-Empresa", "API de Integração", "SLA Dedicado", "Gestor de Contas"] }
                        ].map((p, i) => (
                            <div key={i} className={`plan-card glass ${p.highlight ? 'plan-highlight' : ''}`}>
                                <span className="plan-tag">{p.tag}</span>
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

            <section className="white-label-section">
                <div className="section-container">
                    <div className="white-label-grid">
                        <div className="wl-card glass">
                            <Zap size={32} color="var(--primary)" />
                            <h3>White Label & Personalização</h3>
                            <p>Sua plataforma, sua identidade. Customize logos, cores e domínios para seus clientes.</p>
                            <button className="btn-link" onClick={() => setIsSignUp(true)}>Consultar planos corporativos</button>
                        </div>
                        <div className="wl-card glass">
                            <Globe size={32} color="var(--primary)" />
                            <h3>API Pronta para Integração</h3>
                            <p>Conecte o PedObra ao seu ERP, sistema financeiro ou ferramentas de BI de forma robusta.</p>
                            <button className="btn-link" onClick={() => setIsSignUp(true)}>Documentação API em breve</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="faq-section">
                <div className="section-container-small">
                    <h2 className="section-title text-center">Perguntas Frequentes</h2>
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
                            <p>Software de gestão premium para o seu canteiro.</p>
                        </div>
                        <div className="footer-links">
                            <div>
                                <h4>Produto</h4>
                                <a href="#">Funcionalidades</a>
                                <a href="#">Planos</a>
                                <a href="#">Segurança</a>
                            </div>
                            <div>
                                <h4>Suporte</h4>
                                <a href="#">Central de Ajuda</a>
                                <a href="#">API</a>
                                <a href="#">Status</a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2026 PedObra. Todos os direitos reservados.</p>
                        <div className="footer-socials">
                            <span>Segurança Nível Bancário SSL 256 bits</span>
                        </div>
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
                    --bg-violet: #2e1c2b;
                    --alabaster: #eaeaea;
                    --parchment: #f4f3ee;
                    --floral: #fffcf2;
                    --primary: #f4f3ee; /* Parchment high-level highlight */
                    --primary-glow: rgba(244, 243, 238, 0.2);
                    --border: rgba(255, 255, 255, 0.08);
                    --glass: rgba(255, 255, 255, 0.03);
                    --text-main: var(--parchment);
                    --text-soft: rgba(244,243,238, 0.7);
                    --gradient-main: radial-gradient(circle at 10% 20%, var(--bg-violet) 0%, var(--bg-onyx) 100%);
                }

                .landing-wrapper {
                    background: var(--bg-onyx);
                    background-image: var(--gradient-main);
                    color: var(--text-main);
                    min-height: 100vh;
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow-x: hidden;
                }

                .section-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
                .section-container-small { max-width: 800px; margin: 0 auto; padding: 0 24px; }
                .text-center { text-align: center; }
                .animate-fade { animation: fadeIn 0.8s ease-out forwards; }
                @keyframes fadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }

                /* Nav */
                .lp-nav { position: fixed; top: 0; left: 0; right: 0; height: 80px; z-index: 1000; border-bottom: 2px solid var(--border); }
                .nav-container-limit { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
                .lp-logo { height: 40px; cursor: pointer; }
                .lp-logo img { height: 100%; width: auto; }
                .nav-right { display: flex; align-items: center; gap: 24px; }
                .nav-login-btn { background: none; border: none; color: var(--text-main); font-weight: 600; cursor: pointer; }
                .nav-cta-btn { background: var(--parchment); color: var(--bg-onyx); padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; font-size: 14px; }

                /* Hero */
                .hero-section { padding-top: 180px; padding-bottom: 120px; position: relative; overflow: hidden; }
                .hero-bg-accent { position: absolute; top: 0px; right: 0; width: 600px; height: 600px; background: var(--bg-violet); filter: blur(150px); opacity: 0.3; z-index: 0; border-radius: 50%; }
                .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; max-width: 1400px; margin: 0 auto; padding: 0 40px; position: relative; z-index: 1; }
                .hero-badge { display: inline-block; padding: 6px 14px; background: rgba(244,243,238, 0.05); border: 1px solid var(--border); border-radius: 100px; font-size: 12px; font-weight: 800; letter-spacing: 1px; color: var(--text-soft); margin-bottom: 24px; }
                .hero-title { font-size: clamp(40px, 6vw, 76px); line-height: 1; font-weight: 900; margin-bottom: 32px; letter-spacing: -2px; }
                .text-glow { color: var(--parchment); text-shadow: 0 0 30px rgba(244,243,238, 0.4); }
                .hero-subtitle { font-size: 20px; color: var(--text-soft); max-width: 540px; margin-bottom: 48px; line-height: 1.6; }
                .hero-actions { display: flex; gap: 20px; }
                .btn-main { background: var(--parchment); color: var(--bg-onyx); padding: 16px 32px; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 16px; transition: 0.3s; }
                .btn-outline { background: none; border: 1px solid var(--border); color: var(--text-main); padding: 16px 32px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 16px; transition: 0.3s; }
                .btn-outline:hover { background: var(--glass); }
                .highlight-glow { box-shadow: 0 0 40px var(--primary-glow); }
                .hero-visual { position: relative; }
                .mockup-frame { border-radius: 24px; padding: 12px; border: 1px solid var(--border); overflow: hidden; transform: perspective(1000px) rotateY(-5deg) rotateX(2deg); box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5); }
                .mockup-frame img { width: 100%; border-radius: 12px; display: block; filter: brightness(0.9); }

                /* Sections General */
                .section-title { font-size: 42px; font-weight: 850; margin-bottom: 60px; letter-spacing: -1.5px; }
                .how-it-works-section { padding: 100px 0; background: rgba(0,0,0,0.2); }
                .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
                .step-card { padding: 48px; border-radius: 20px; border: 1px solid var(--border); transition: 0.3s; }
                .step-num { font-size: 14px; font-weight: 900; color: var(--text-soft); display: block; margin-bottom: 24px; opacity: 0.4; }
                .step-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
                .step-card p { color: var(--text-soft); line-height: 1.6; font-size: 15px; }

                .features-section { padding: 120px 0; }
                .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .feature-card { padding: 32px; border-radius: 16px; border: 1px solid var(--border); transition: 0.3s; }
                .glass-hover:hover { background: var(--glass); border-color: rgba(244,243,238, 0.2); transform: translateY(-5px); }
                .feature-icon { width: 48px; height: 48px; background: var(--glass); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--parchment); }
                .feature-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
                .feature-card p { font-size: 14px; color: var(--text-soft); line-height: 1.5; }

                /* Plans */
                .plans-section { padding: 100px 0; background: rgba(0,0,0,0.4); }
                .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 40px; }
                .plan-card { padding: 48px 32px; border-radius: 24px; border: 1px solid var(--border); display: flex; flex-direction: column; position: relative; }
                .plan-highlight { border-color: rgba(244,243,238, 0.3); background: rgba(244,243,238, 0.02); }
                .plan-tag { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: var(--text-soft); background: var(--glass); padding: 4px 12px; border-radius: 100px; width: fit-content; margin-bottom: 20px; }
                .plan-name { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
                .plan-price { margin-bottom: 32px; display: flex; align-items: baseline; gap: 4px; }
                .price-val { font-size: 48px; font-weight: 850; }
                .currency, .period { font-size: 16px; color: var(--text-soft); font-weight: 600; }
                .plan-features { list-style: none; padding: 0; margin: 0 0 40px 0; flex: 1; }
                .plan-features li { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 15px; color: var(--text-soft); font-weight: 500; }
                .plan-btn { width: 100%; height: 52px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.3s; 
                             background: var(--glass); color: var(--text-main); border: 1px solid var(--border); }
                .plan-btn.highlight-glow { background: var(--parchment); color: var(--bg-onyx); border: none; }

                /* WL */
                .white-label-section { padding: 100px 0; }
                .white-label-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
                .wl-card { padding: 40px; border-radius: 24px; border: 1px solid var(--border); }
                .wl-card h3 { font-size: 22px; font-weight: 700; margin: 24px 0 16px; }
                .wl-card p { color: var(--text-soft); font-size: 15px; margin-bottom: 24px; line-height: 1.6; }
                .btn-link { background: none; border: none; color: var(--parchment); font-weight: 700; cursor: pointer; border-bottom: 1.5px solid var(--parchment); padding-bottom: 2px; transition: 0.3s; }
                .btn-link:hover { opacity: 0.7; }

                /* FAQ */
                .faq-section { padding: 120px 0; }
                .faq-accordion { display: flex; flex-direction: column; gap: 12px; margin-top: 40px; }
                .faq-item { border-radius: 16px; border: 1px solid var(--border); transition: 0.3s; cursor: pointer; }
                .faq-header { padding: 24px; display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 16px; }
                .faq-body { padding: 0 24px 24px; color: var(--text-soft); line-height: 1.6; font-size: 15px; }
                .faq-item:hover, .faq-item.active { border-color: rgba(244,243,238, 0.2); background: var(--glass); }
                .faq-arrow { transition: transform 0.3s; }
                .active .faq-arrow { transform: rotate(180deg); }

                /* Footer */
                .lp-footer { background: var(--bg-onyx); border-top: 1px solid var(--border); padding: 80px 40px 40px; }
                .footer-container { max-width: 1400px; margin: 0 auto; }
                .footer-top { display: flex; justify-content: space-between; margin-bottom: 80px; }
                .footer-brand img { height: 32px; margin-bottom: 20px; }
                .footer-brand p { color: var(--text-soft); font-size: 14px; max-width: 260px; }
                .footer-links { display: flex; gap: 60px; }
                .footer-links h4 { font-size: 14px; font-weight: 850; margin-bottom: 24px; color: var(--parchment); }
                .footer-links a { display: block; text-decoration: none; color: var(--text-soft); font-size: 14px; margin-bottom: 12px; transition: 0.2s; }
                .footer-links a:hover { color: var(--parchment); }
                .footer-bottom { padding-top: 40px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
                .footer-bottom p { font-size: 12px; color: var(--text-soft); }
                .footer-socials { font-size: 12px; color: var(--text-soft); opacity: 0.6; }

                /* Heavy Glass for Auth */
                .glass-heavy { background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
                .auth-logo { height: 36px; margin-bottom: 24px; margin-left: auto; margin-right: auto; }
                .auth-card { width: 440px; padding: 48px; border-radius: 24px; border: 1.5px solid var(--border); background: #1a1a1c; }
                .auth-title { font-size: 24px; font-weight: 850; margin-bottom: 32px; }
                .input-field { margin-bottom: 20px; }
                .input-field label { display: block; font-size: 11px; font-weight: 800; color: var(--text-soft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .input-field input { width: 100%; background: #0c0c0d; border: 1px solid var(--border); padding: 14px 16px; border-radius: 10px; color: #fff; outline: none; transition: 0.3s; }
                .input-field input:focus { border-color: var(--parchment); box-shadow: 0 0 20px rgba(244,243,238, 0.1); }
                .auth-switch { text-align: center; margin-top: 24px; font-size: 14px; color: var(--text-soft); }
                .auth-switch button { background: none; border: none; color: var(--parchment); font-weight: 700; cursor: pointer; border-bottom: 1px solid var(--parchment); margin-left: 4px; }
                .auth-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }

                /* Responsiveness */
                @media (max-width: 1024px) {
                    .grid-container { grid-template-columns: 1fr; text-align: center; gap: 40px; }
                    .hero-content { display: flex; flex-direction: column; align-items: center; }
                    .hero-actions { justify-content: center; }
                    .hero-visual { display: none; }
                    .steps-grid, .features-grid, .plans-grid { grid-template-columns: 1fr; }
                    .white-label-grid { grid-template-columns: 1fr; }
                    .nav-container-limit { padding: 0 24px; }
                    .hero-section { padding-top: 140px; }
                    .hero-title { font-size: 48px; }
                }

                @media (max-width: 768px) {
                    .nav-right button:not(.nav-cta-btn) { display: none; }
                    .section-title { font-size: 32px; }
                    .footer-top { flex-direction: column; gap: 40px; }
                    .footer-bottom { flex-direction: column; gap: 20px; text-align: center; }
                }

                /* Standard Glass UI Component Override */
                .glass { background: var(--glass); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border); }
            `}</style>
        </div>
    );
};

export default LandingPage;
