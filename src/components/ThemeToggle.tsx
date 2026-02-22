import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
    // Tema claro (light) será o padrão se não houver no localStorage
    const [theme, setTheme] = useState(localStorage.getItem('pedobra_theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pedobra_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggleTheme}
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: theme === 'light' ? '#1D1D1F' : '#F5F5F7',
                color: theme === 'light' ? '#FFFFFF' : '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                border: 'none',
                cursor: 'pointer',
                zIndex: 9999,
                transition: 'all 0.3s ease'
            }}
            title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
        >
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
    );
}
