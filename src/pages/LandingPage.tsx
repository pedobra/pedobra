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
    CheckCircle
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
    const [planCycle, setPlanCycle] = useState('Mensal');
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [visibleFaqs, setVisibleFaqs] = useState<Set<number>>(new Set());


    useEffect(() => {
        const shouldOpenLogin = localStorage.getItem('openLogin');
        if (shouldOpenLogin === 'true') {
            setIsLogin(true);
            localStorage.removeItem('openLogin');
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    setVisibleFaqs(prev => new Set(prev).add(index));
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.faq-item').forEach(el => observer.observe(el));
        return () => observer.disconnect();
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
        { 
            type: "grande",
            icon: <Package size={32} />, 
            title: "Nunca mais perca um pedido na obra", 
            desc: "Controle total do fluxo de aprovação e histórico completo de cada solicitação em tempo real." 
        },
        { 
            type: "medio",
            icon: <Construction size={24} />, 
            title: "Evite desperdício de material", 
            desc: "Catálogo unificado e inventário automatizado para evitar que materiais sumam sem explicação." 
        },
        { 
            type: "medio",
            icon: <LayoutDashboard size={24} />, 
            title: "Painel Multi-obra", 
            desc: "Gerencie múltiplos canteiros de forma centralizada. Visão panorâmica de toda sua operação." 
        },
        { 
            type: "pequeno",
            icon: <ShieldCheck size={24} />, 
            title: "Auditoria Completa", 
            desc: "Saiba quem pediu, quem aprovou e quando chegou." 
        },
        { 
            type: "pequeno",
            icon: <FileText size={24} />, 
            title: "Relatórios Instantâneos", 
            desc: "PDFs prontos para envio ou impressão em segundos." 
        },
        { 
            type: "pequeno",
            icon: <Users size={24} />, 
            title: "Gestão de Equipes", 
            desc: "Acesso controlado para mestres e gestores." 
        },
    ];

    const testimonials = [
        { name: "Ricardo Silva", role: "Gestor de Obras", company: "Construtora Alpha", content: "O PedObra reduziu nosso desperdício de materiais em 20% no primeiro mês. O controle de pedidos é imbatível.", stars: 5, featured: true },
        { name: "Ana Oliveira", role: "Engenheira Civil", company: "Engenharia S.A.", content: "A facilidade de aprovação pelo app mudou nossa rotina. O mestre pede no campo e eu aprovo em segundos da sede.", stars: 5 },
        { name: "Marcos Torres", role: "Sócio", company: "Projetos & Canteiros", content: "Finalmente tenho visão clara de onde está indo o dinheiro de cada obra. O suporte é excelente.", stars: 5 },
        { name: "Julia Mendes", role: "Suprimentos", company: "Pedra & Cal", content: "Gerar pedidos em PDF com um clique, economiza horas de meu dia.", stars: 5 },
        { name: "Carlos Eduardo", role: "Mestre de Obras", company: "Urbaniza", content: "O app é tão simples que até quem não tem tecnologia aprende em minutos. Recomendo.", stars: 5 }
    ];

    const partners = [
        "/assets/logos/logo_nova_base_1774198066894.png",
        "/assets/logos/logo_prime_estruturas_1774198084283.png",
        "/assets/logos/logo_forteobra_1774198100075.png",
        "/assets/logos/logo_atlas_engenharia_1774198115698.png",
        "/assets/logos/logo_horizonte_obras_1774198131367.png",
        "/assets/logos/logo_alfabuild_1774198146933.png",
        "/assets/logos/logo_pedra_forte_1774198161312.png",
        "/assets/logos/logo_nexus_engenharia_1774198176416.png",
        "/assets/logos/logo_obramax_solucoes_1774198191073.png",
        "/assets/logos/logo_construtora_pilar_1774198207165.png",
        "/assets/logos/logo_vertice_engenharia_1774198222092.png"
    ];
    const [testiIndex, setTestiIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTestiIndex(prev => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [testimonials.length]);

    const faqs = [
        { q: "O sistema funciona em celular?", a: "Sim! O PedObra é totalmente responsivo e foi desenhado para funcionar perfeitamente em smartphones, tablets e computadores." },
        { q: "Como funciona o período de teste de 7 dias?", a: "Ao se cadastrar, você ganha acesso total a todas as funcionalidades do plano Professional por 7 dias. Nenhuma cobrança é feita durante este período." },
        { q: "Posso exportar meus pedidos para PDF?", a: "Com certeza. Todos os pedidos podem ser exportados para PDF, assim você pode enviar o anexo via WhatsApp." },
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
                                Tudo que acontece na sua obra, na palma da sua mão. Sem achismo. Sem atraso. Sem prejuízo.
                            </p>
                            <ul className="venda-bullets">
                                <li><CheckCircle size={20} className="bullet-icon" /> Acompanhe pedidos em tempo real</li>
                                <li><CheckCircle size={20} className="bullet-icon" /> Controle materiais e custos</li>
                                <li><CheckCircle size={20} className="bullet-icon" /> Evite erros e desperdícios</li>
                                <li><CheckCircle size={20} className="bullet-icon" /> Tela exclusiva para o operador na obra</li>
                            </ul>
                            <div className="venda-actions">
                                <button className="btn-venda highlight-glow" onClick={() => setIsSignUp(true)}>
                                    Testar agora
                                </button>
                            </div>
                        </div>

                        <div className="venda-mockup-area animate-fade">
                            <div className="venda-mockup-grid-v7">
                                {/* Mockup 1: Dashboard */}
                                <div className="mockup-card-v7">
                                    <div className="mockup-floating-card glass-heavy">
                                        <div className="mockup-screen-header">
                                            <div className="dots"><span></span><span></span><span></span></div>
                                        </div>
                                        <div className="mockup-img-wrapper">
                                            <img src="/assets/screenshots/dashboard.png" alt="Dashboard" className="mockup-img" />
                                            <div className="floating-element card-stats glass animate-float-slow">
                                                <div className="stat-label">Economia mensal</div>
                                                <div className="stat-value">+R$ 12.450</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mockup 2: Operações de Campo */}
                                <div className="mockup-card-v7">
                                    <div className="mockup-floating-card glass-heavy">
                                        <div className="mockup-screen-header">
                                            <div className="dots"><span></span><span></span><span></span></div>
                                        </div>
                                        <div className="mockup-img-wrapper">
                                            <img src="/assets/screenshots/operador.png" alt="Campo" className="mockup-img" />
                                            <div className="floating-element card-alert glass animate-float-fast">
                                                <div className="stat-label">Recebimento</div>
                                                <div className="stat-value">Aprovado</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mockup 3: Gestão de Pedidos */}
                                <div className="mockup-card-v7">
                                    <div className="mockup-floating-card glass-heavy">
                                        <div className="mockup-screen-header">
                                            <div className="dots"><span></span><span></span><span></span></div>
                                        </div>
                                        <div className="mockup-img-wrapper">
                                            <img src="/assets/screenshots/pedidos.png" alt="Pedidos" className="mockup-img" />
                                            <div className="floating-element card-stats glass animate-float-slow">
                                                <div className="stat-label">Aguardando</div>
                                                <div className="stat-value">3 Pedidos</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mockup 4: Relatórios */}
                                <div className="mockup-card-v7">
                                    <div className="mockup-floating-card glass-heavy">
                                        <div className="mockup-screen-header">
                                            <div className="dots"><span></span><span></span><span></span></div>
                                        </div>
                                        <div className="mockup-img-wrapper">
                                            <img src="/assets/screenshots/relatorios.png" alt="Relatórios" className="mockup-img" />
                                            <div className="floating-element card-alert glass animate-float-fast">
                                                <div className="stat-label">Gasto Total</div>
                                                <div className="stat-value">92% Obra</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Badges Row */}
                            <div className="venda-badges-row animate-fade">
                                <span className="badge-pill">Simples</span>
                                <span className="badge-pill">Rápido</span>
                                <span className="badge-pill">Fácil Manuseio</span>
                                <span className="badge-pill">Redução de Perdas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="steps-section">
                <div className="section-container">
                    <h2 className="section-title text-center">Do pedido ao controle total, sem ruído</h2>
                    <div className="flow-container">
                        <div className="energy-line-wrapper">
                            <div className="energy-line"></div>
                            <div className="energy-pulse"></div>
                        </div>
                        <div className="steps-grid-v9">
                            {[
                                { icon: <Construction size={32} />, title: "Pedido em Campo", desc: "Mestres de obra solicitam insumos direto pelo celular." },
                                { icon: <Package size={32} />, title: "Gestão Inteligente", desc: "Recebimentos e aprovações rápidas dos pedidos em um só lugar." },
                                { icon: <ShieldCheck size={32} />, title: "Controle Total", desc: "Acompanhe materiais e custos em tempo real." }
                            ].map((s, i) => (
                                <div key={i} className={`step-card-v9 glass step-index-${i}`}>
                                    <div className="step-icon-inner">
                                        {s.icon}
                                    </div>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flow-cta-wrapper text-center">
                            <button className="btn-venda highlight-glow" onClick={() => setIsSignUp(true)}>QUERO COMEÇAR AGORA</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="logo-marquee-section">
                <div className="section-container">
                    <p className="marquee-title text-center">Empresas que já organizaram suas obras com o PedObra</p>
                    <div className="marquee-container">
                        <div className="marquee-content">
                            {[...partners, ...partners].map((p, i) => (
                                <div key={i} className="marquee-item">
                                    <img src={p} alt="Parceiro" className="partner-logo" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="testimonials-section">
                <div className="section-container">
                    <h2 className="section-title text-center">Quem usa, não volta atrás</h2>
                    <div className="testimonials-carousel">
                        <div className="testimonials-wrapper" style={{ transform: `translateX(-${testiIndex * 100}%)` }}>
                            {testimonials.map((t, i) => (
                                <div key={i} className={`testimonial-card-container ${testiIndex === i ? 'active' : ''}`}>
                                    <div className={`testimonial-card glass ${t.featured ? 'featured' : ''}`}>
                                        <div className="stars">
                                            {[...Array(t.stars)].map((_, si) => <CheckCircle key={si} size={14} className="star-icon" />)}
                                        </div>
                                        <p className="testimonial-content">"{t.content}"</p>
                                        <div className="testimonial-footer">
                                            <div className="user-avatar">{t.name[0]}</div>
                                            <div className="user-info">
                                                <span className="user-name">{t.name}</span>
                                                <span className="user-meta">{t.role} • {t.company}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="carousel-nav">
                            {testimonials.map((_, i) => (
                                <button key={i} className={`nav-dot ${testiIndex === i ? 'active' : ''}`} onClick={() => setTestiIndex(i)} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="features-section">
                <div className="section-container">
                    <h2 className="section-title">Tecnologia para resultados reais</h2>
                    <div className="features-grid-v9">
                        {features.map((f, i) => (
                            <div key={i} className={`feature-card-v9 glass-hover feature-card-${f.type}`}>
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                                {f.type === 'grande' && (
                                    <div className="hero-mockup-mini">
                                        <img src="/assets/screenshots/pedidos.png" alt="Interface Pedidos" />
                                    </div>
                                )}
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
                                { 
                                    name: "Plano Básico", 
                                    price: "97,00", 
                                    period: "30 DIAS",
                                    features: [
                                        "2 obras",
                                        "2 dois usuários (Operários)",
                                        "Suporte Via WhatsApp"
                                    ]
                                },
                                { 
                                    name: "Plano Profissional", 
                                    price: "147,00", 
                                    period: "30 DIAS",
                                    highlight: true,
                                    recommended: true,
                                    badge: "MELHOR CUSTO BENEFÍCIO",
                                    features: [
                                        "Obras Ilimitadas",
                                        "Usuários Ilimitados (Operários)",
                                        "Pedidos Ilimitados",
                                        "Cadastro de Materiais Ilimitado",
                                        "Relatórios Interativos",
                                        "Suporte Via WhatsApp"
                                    ]
                                },
                                { 
                                    name: "Plano Personalizado", 
                                    price: "Consultar", 
                                    isCustom: true,
                                    features: [
                                        "Obras Ilimitadas",
                                        "Usuários Ilimitados (Operários)",
                                        "Pedidos Ilimitados",
                                        "Cadastro de Materiais Ilimitado",
                                        "Relatórios Interativos",
                                        "Suporte Via WhatsApp"
                                    ],
                                    durations: ["Trimestral", "Semestral", "Anual"]
                                }
                            ].map((p, i) => (
                                <div key={i} className={`plan-card glass ${p.highlight ? 'plan-highlight' : ''}`}>
                                    {p.recommended && <div className="plan-badge-top">RECOMENDADO</div>}
                                    <h3 className="plan-name">{p.name}</h3>
                                    
                                    {p.badge && <div className="benefit-pill"><CheckCircle size={12} /> {p.badge}</div>}
                                    
                                    <div className="plan-price-v13">
                                        <div className="price-label">Valor de R$</div>
                                        <div className="price-row">
                                            <span className="price-val">{p.price}</span>
                                        </div>
                                        <div className="price-period">{p.isCustom ? planCycle.toUpperCase() : p.period}</div>
                                    </div>

                                    {p.isCustom && (
                                        <div className="plan-cycle-selector">
                                            {p.durations.map(d => (
                                                <button 
                                                    key={d} 
                                                    className={`cycle-btn ${planCycle === d ? 'active' : ''}`}
                                                    onClick={() => setPlanCycle(d)}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="plan-features-header">TERÁ ACESSO:</div>
                                    <ul className="plan-features">
                                        {p.features.map((f, fi) => <li key={fi}><Check size={16} color={p.highlight ? "#10B981" : "var(--text-soft)"} /> {f}</li>)}
                                    </ul>
                                    <button className={`plan-btn ${p.highlight ? 'highlight-glow' : ''}`} onClick={() => {
                                        if (p.isCustom) {
                                            window.open(`https://wa.me/5583996254920?text=Olá, quero saber mais sobre o Plano ${planCycle}`, '_blank');
                                        } else {
                                            setIsSignUp(true);
                                        }
                                    }}>ASSINAR AGORA</button>
                                </div>
                            ))}
                        </div>

                        <div className="white-label-banner glass animate-fade">
                            <div className="wl-content">
                                <h3 className="wl-title">Compre o Sistema como White Label.</h3>
                                <p className="wl-subtitle">Personalize com sua marca e revenda.</p>
                            </div>
                            <a 
                                href="https://wa.me/5583996254920?text=Olá,%20Tenho%20interesse%20em%20adquirir%20como%20White%20Label." 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="wl-cta"
                            >
                                Saiba Como
                            </a>
                        </div>
                </div>
            </section>

            <section className="faq-section">
                <div className="section-container-small">
                    <div className="hero-badge mx-auto mb-8 animate-fade" style={{ width: 'fit-content' }}>FAQ</div>
                    <div className="faq-accordion">
                        {faqs.map((f, i) => (
                            <div 
                                key={i} 
                                data-index={i}
                                className={`faq-item glass ${activeFaq === i ? 'active' : ''} ${visibleFaqs.has(i) ? 'in-view' : ''}`} 
                                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                            >
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
                <div className="section-container">
                    <div className="footer-grid">
                        {/* BLOCO 1: Branding */}
                        <div className="footer-brand">
                            <img src="https://muegcrtspcrwesyxscgl.supabase.co/storage/v1/object/public/assets/Logo_pedobra01.png" alt="PedObra Logo" className="footer-logo-img" />
                            <p className="footer-tagline">Controle total da sua obra, sem caos e sem perda de pedidos.</p>
                        </div>

                        {/* BLOCO 2: Navegação */}
                        <div className="footer-nav">
                            <h4 className="footer-title">Navegação</h4>
                            <ul className="footer-links">
                                <li><a href="#">Início</a></li>
                                <li><a href="#venda-mockup">Funcionalidades</a></li>
                                <li><a href="#venda-mockup">Como funciona</a></li>
                                <li><a href="https://wa.me/5583996254920" target="_blank" rel="noopener noreferrer">Contato</a></li>
                            </ul>
                        </div>

                        {/* BLOCO 3: Conversão */}
                        <div className="footer-cta">
                            <button className="footer-btn-pulse" onClick={() => setIsSignUp(true)}>Teste grátis</button>
                            <div className="footer-security">
                                <ShieldCheck size={14} />
                                <span>100% SEGURO</span>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <div className="footer-copyright">
                            <p>© 2026 Pedobra App</p>
                        </div>
                        <div className="footer-privacy">
                            <span>Dados protegidos • SSL 256 bits</span>
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
                .venda-section { padding: 120px 0; background: radial-gradient(circle at 75% 50%, #1a1a1a 0%, #000000 100%); overflow: hidden; }
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

                .venda-mockup-area { position: relative; }
                .venda-mockup-grid-v7 { 
                    display: grid; 
                    grid-template-columns: repeat(2, 1fr); 
                    gap: 32px; 
                    perspective: 2000px;
                }
                
                .mockup-card-v7 { 
                    transform-style: preserve-3d;
                    transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
                    cursor: pointer;
                }
                .mockup-card-v7:hover { transform: rotateY(-10deg) rotateX(5deg) scale(1.02); z-index: 10; }

                .mockup-floating-card { 
                    position: relative;
                    border-radius: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.6);
                    box-shadow: 
                        0 15px 40px rgba(0,0,0,0.6),
                        0 0 25px rgba(255, 255, 255, 0.2);
                    overflow: hidden;
                    background: #111;
                    transition: border 0.3s, box-shadow 0.3s;
                }
                .mockup-card-v7:hover .mockup-floating-card {
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    box-shadow: 
                        0 20px 50px rgba(0,0,0,0.8),
                        0 0 40px rgba(255, 255, 255, 0.3);
                }
                .mockup-img-wrapper { position: relative; width: 100%; border-radius: 0 0 12px 12px; overflow: hidden; }
                .mockup-img { width: 100%; display: block; filter: contrast(1.1); }
                
                .venda-badges-row {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-top: 40px;
                    flex-wrap: wrap;
                }
                .badge-pill {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 6px 12px;
                    border-radius: 100px;
                    font-size: 10px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.6);
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    transition: 0.3s;
                }
                .badge-pill:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    transform: translateY(-2px);
                }
                
                .mockup-screen-header { 
                    height: 24px; 
                    padding: 0 12px; 
                    display: flex; 
                    align-items: center; 
                    background: rgba(255,255,255,0.05);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .mockup-screen-header .dots { display: flex; gap: 4px; }
                .mockup-screen-header .dots span { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.2); }

                .floating-element {
                    position: absolute;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    z-index: 20;
                    box-shadow: 10px 10px 20px rgba(0,0,0,0.4);
                }
                .card-stats { bottom: 20px; right: -20px; transform: translateZ(30px); }
                .card-alert { top: 20px; right: -15px; transform: translateZ(40px); }
                .stat-label { font-size: 9px; font-weight: 800; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
                .stat-value { font-size: 14px; font-weight: 900; color: #fff; }

                @media (max-width: 1024px) {
                    .venda-grid { grid-template-columns: 1fr; gap: 60px; text-align: center; }
                    .venda-content { display: flex; flex-direction: column; align-items: center; }
                    .venda-mockup-grid-v7 { grid-template-columns: repeat(2, 1fr); gap: 24px; }
                    .card-stats, .card-alert { display: none; }
                }
                @media (max-width: 640px) {
                    .venda-mockup-grid-v7 { grid-template-columns: 1fr; }
                    .mockup-card-v7:hover { transform: none; }
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

                /* Steps Section V9 */
                .flow-container { 
                    position: relative; 
                    margin-top: 60px; 
                    padding: 40px 0;
                }
                .energy-line-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 15%;
                    right: 15%;
                    height: 2px;
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-50%);
                    z-index: 1;
                    display: block;
                }
                .energy-pulse {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    width: 150px;
                    background: linear-gradient(90deg, transparent, var(--primary), transparent);
                    filter: blur(2px);
                    box-shadow: 0 0 15px var(--primary);
                    animation: pulse-move 4s linear infinite;
                }
                @keyframes pulse-move {
                    0% { left: -20%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { left: 110%; opacity: 0; }
                }

                .steps-grid-v9 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 40px;
                    position: relative;
                    z-index: 2;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .step-card-v9 {
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 20px;
                    background: rgba(0,0,0,0.4);
                    border: 2px solid rgba(255,255,255,0.1);
                    transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    animation: card-hit-glow 4s infinite;
                }
                .step-index-0 { animation-delay: 0.5s; }
                .step-index-1 { animation-delay: 2s; }
                .step-index-2 { animation-delay: 3.5s; }

                @keyframes card-hit-glow {
                    0%, 10%, 30%, 100% { 
                        border-color: rgba(255,255,255,0.05);
                        box-shadow: none;
                        transform: scale(1);
                    }
                    20% { 
                        border-color: var(--primary);
                        box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.2);
                        transform: scale(1.02);
                        background: rgba(var(--primary-rgb), 0.05);
                    }
                }

                .step-icon-inner {
                    width: 52px;
                    height: 52px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    color: var(--primary);
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: 0.3s;
                }
                .step-card-v9:hover .step-icon-inner {
                    transform: translateY(-5px) rotate(5deg);
                    background: var(--primary);
                    color: #000;
                }
                .step-num-v9 {
                    font-family: 'Inter', sans-serif;
                    font-weight: 900;
                    font-size: 11px;
                    color: var(--primary);
                    opacity: 0.5;
                    margin-bottom: 6px;
                    display: block;
                }
                .steps-section { 
                    padding: 140px 0; 
                    background: radial-gradient(circle at center, #111 0%, #000 100%); 
                    overflow: hidden; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .flow-cta-wrapper {
                    margin-top: 60px;
                    width: 100%;
                }

                @media (max-width: 768px) {
                    .energy-line-wrapper { display: none; }
                    .steps-grid-v9 { grid-template-columns: 1fr; }
                    .step-card-v9 { animation: none; }
                }

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
                .features-section { padding: 120px 0; background: #000; overflow: hidden; }
                .features-grid-v9 { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 32px; 
                    margin-top: 60px;
                }
                .feature-card-v9 { 
                    padding: 32px; 
                    border-radius: 20px; 
                    border: 2px solid rgba(255,255,255,0.05); 
                    transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    background: rgba(255,255,255,0.01);
                }
                .feature-card-v9:hover {
                    transform: translateY(-8px);
                    border-color: var(--primary);
                    box-shadow: 0 20px 40px rgba(var(--primary-rgb), 0.1);
                    background: rgba(var(--primary-rgb), 0.03);
                }

                .feature-card-grande {
                    grid-column: span 2;
                    grid-row: span 2;
                    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.8) 100%);
                    display: flex;
                    flex-direction: column;
                }
                .feature-card-grande h3 { font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 16px; color: #fff; }
                .feature-card-grande p { font-size: 18px; line-height: 1.6; color: var(--text-soft); }
                
                .hero-mockup-mini {
                    margin-top: auto;
                    padding-top: 30px;
                    border-radius: 12px;
                    overflow: hidden;
                    opacity: 0.8;
                    transition: 0.3s;
                }
                .feature-card-grande:hover .hero-mockup-mini { opacity: 1; transform: scale(1.02); }
                .hero-mockup-mini img { width: 100%; display: block; filter: contrast(1.1) brightness(0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }

                .feature-card-medio { grid-column: span 1; padding: 40px 32px; }
                .feature-card-pequeno { grid-column: span 1; padding: 24px; }
                .feature-card-v9 h3 { font-size: 20px; font-weight: 800; margin-bottom: 12px; }
                .feature-card-v9 p { font-size: 14px; color: var(--text-soft); line-height: 1.6; }
                .feature-icon { margin-bottom: 24px; color: var(--primary); }

                @media (max-width: 1024px) {
                    .features-grid-v9 { grid-template-columns: 1fr; }
                    .feature-card-grande, .feature-card-medio, .feature-card-pequeno { grid-column: span 1; grid-row: auto; }
                    .feature-card-grande h3 { font-size: 24px; }
                }

                .plans-section { padding: 120px 0; background: rgba(0,0,0,0.3); }
                .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; max-width: 1200px; margin: 0 auto; align-items: stretch; }
                .plan-card { padding: 48px 40px; border-radius: 32px; text-align: center; position: relative; display: flex; flex-direction: column; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .plan-card:hover { transform: translateY(-10px); box-shadow: 0 30px 60px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.2); }
                .plan-highlight { border: 2px solid #fff; scale: 1.05; z-index: 10; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
                .plan-highlight:hover { transform: translateY(-10px) scale(1.06); }
                
                .plan-badge-top { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); background: #000; color: #fff; padding: 6px 20px; border-radius: 12px; font-size: 12px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
                .benefit-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 6px 14px; border-radius: 100px; font-size: 11px; font-weight: 800; margin: 0 auto 24px; text-transform: uppercase; border: 1px solid rgba(16, 185, 129, 0.2); }
                
                .plan-name { font-size: 24px; font-weight: 800; margin-bottom: 24px; }
                .plan-price-v13 { margin-bottom: 40px; }
                .price-label { font-size: 18px; font-weight: 700; opacity: 0.9; margin-bottom: 8px; }
                .price-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
                .price-val { font-size: 56px; font-weight: 950; letter-spacing: -2px; }
                .price-period { font-size: 14px; font-weight: 900; opacity: 0.6; margin-top: 8px; letter-spacing: 1px; }
                
                .plan-features-header { font-size: 12px; font-weight: 900; color: var(--text-soft); text-align: left; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); }
                .plan-features { list-style: none; padding: 0; margin-bottom: 40px; text-align: left; flex: 1; }
                .plan-features li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; margin-bottom: 16px; color: #fff; font-weight: 500; }
                .plan-features li svg { flex-shrink: 0; margin-top: 2px; }
                
                .plan-cycle-selector { display: flex; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; margin-bottom: 32px; gap: 4px; }
                .cycle-btn { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; transition: 0.2s; }
                .cycle-btn.active { background: #fff; color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                
                .plan-btn { width: 100%; padding: 18px; border-radius: 14px; font-size: 16px; font-weight: 950; cursor: pointer; transition: 0.3s; background: #fff; color: #000 !important; border: 2px solid #fff; text-transform: uppercase; letter-spacing: 1px; }
                .plan-btn:hover { background: #10B981; border-color: #10B981; transform: translateY(-3px); box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); }

                .white-label-banner {
                    margin-top: 60px;
                    padding: 40px 60px;
                    border-radius: 32px;
                    border: 3px solid #fff;
                    box-shadow: 0 0 40px rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 32px;
                    text-align: left;
                }
                .wl-title { font-size: 28px; font-weight: 900; margin-bottom: 8px; color: #fff; letter-spacing: -1px; }
                .wl-subtitle { font-size: 16px; color: var(--text-soft); font-weight: 500; }
                .wl-cta { 
                    background: #fff; 
                    color: #000 !important; 
                    padding: 16px 40px; 
                    border-radius: 12px; 
                    font-weight: 950; 
                    text-decoration: none; 
                    transition: 0.3s; 
                    white-space: nowrap;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 14px;
                    border: 2px solid #fff;
                }
                .wl-cta:hover { 
                    background: #10B981;
                    border-color: #10B981;
                    transform: scale(1.05); 
                    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); 
                }

                @media (max-width: 768px) {
                    .white-label-banner { flex-direction: column; text-align: center; padding: 40px 24px; margin-top: 40px; }
                    .wl-title { font-size: 22px; }
                    .wl-cta { width: 100%; text-align: center; }
                }

                .faq-section { padding: 100px 0; }
                .faq-accordion { display: flex; flex-direction: column; gap: 12px; }
                .faq-item { 
                    border-radius: 12px; 
                    cursor: pointer; 
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                .faq-item.in-view { opacity: 1; transform: translateY(0); }
                .faq-item:hover { background: rgba(255,255,255,0.05); transform: scale(1.01); border-color: rgba(255,255,255,0.2); }
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

                /* Marquee & Testimonials V11 */
                .logo-marquee-section { padding: 60px 0; background: #000; border-top: 1px solid rgba(255,255,255,0.05); }
                .marquee-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.4); margin-bottom: 32px; text-transform: uppercase; letter-spacing: 1px; }
                .marquee-container { 
                    position: relative; 
                    overflow: hidden; 
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
                .marquee-content { display: flex; gap: 40px; animation: marquee-scroll 60s linear infinite; width: max-content; }
                .marquee-container:hover .marquee-content { animation-play-state: paused; }
                .marquee-item { display: flex; align-items: center; justify-content: center; height: 120px; width: auto; min-width: 200px; pointer-events: none; }
                .partner-logo { max-width: 400px; height: 120px; min-height: 120px; object-fit: contain; mix-blend-mode: screen; opacity: 0.6; filter: grayscale(1) brightness(1.8) contrast(1.2); transition: 0.3s; transform: scale(1.6); }
                .marquee-container:hover .partner-logo { opacity: 1; filter: grayscale(0) brightness(2) contrast(1.3); transform: scale(1.7); }
                @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

                .testimonials-section { padding: 120px 0; background: #0d0d0d; overflow: hidden; }
                .testimonials-carousel { position: relative; max-width: 800px; margin: 0 auto; min-height: 400px; }
                .testimonials-wrapper { display: flex; transition: cubic-bezier(0.165, 0.84, 0.44, 1) 0.8s; }
                .testimonial-card-container { min-width: 100%; padding: 20px; transition: 0.5s; opacity: 0.4; transform: scale(0.9); }
                .testimonial-card-container.active { opacity: 1; transform: scale(1); }
                .testimonial-card { padding: 48px; border-radius: 32px; background: #151515; border: 1px solid rgba(255,255,255,0.05); transition: 0.4s; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
                .testimonial-card.featured { border-color: rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
                .testimonial-card:hover { border-color: var(--primary); box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.1); transform: translateY(-5px); }
                
                .stars { display: flex; gap: 4px; margin-bottom: 24px; }
                .star-icon { color: var(--primary); }
                .testimonial-content { font-size: 20px; font-weight: 600; line-height: 1.6; color: #fff; margin-bottom: 32px; font-style: italic; }
                .testimonial-footer { display: flex; align-items: center; gap: 16px; margin-top: auto; }
                .user-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: #000; display: flex; align-items: center; justify-content: center; font-weight: 950; font-size: 18px; flex-shrink: 0; }
                .user-info { display: flex; flex-direction: column; }
                .user-name { font-weight: 800; color: #fff; }
                .user-meta { font-size: 13px; color: var(--text-soft); }

                .carousel-nav { display: flex; justify-content: center; gap: 8px; margin-top: 40px; }
                .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; cursor: pointer; transition: 0.3s; }
                .nav-dot.active { background: var(--primary); width: 24px; border-radius: 4px; }

                @media (max-width: 768px) {
                    .testimonial-card { padding: 32px; }
                    .testimonial-content { font-size: 16px; }
                    .testimonials-carousel { min-height: 300px; }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
