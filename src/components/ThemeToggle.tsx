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
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '8px',
                transition: '0.3s'
            }}
            title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
        >
            {theme === 'light' ? <Moon size={20} color="var(--text-primary)" /> : <Sun size={20} color="var(--text-primary)" />}
        </button>
    );
}
