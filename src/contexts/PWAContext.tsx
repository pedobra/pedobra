import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAContextType {
    isInstallable: boolean;
    promptToInstall: () => void;
}

const PWAContext = createContext<PWAContextType>({
    isInstallable: false,
    promptToInstall: () => {}
});

export const usePWA = () => useContext(PWAContext);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Previne que o Chrome/Edge mostre o aviso natural imediatamente
            e.preventDefault();
            // Guarda o evento para dispararmos depois no botão do sistema
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const promptToInstall = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('App instalado com sucesso');
                } else {
                    console.log('Instalação cancelada');
                }
                // O prompt só pode ser usado uma vez
                setDeferredPrompt(null);
            });
        }
    };

    return (
        <PWAContext.Provider value={{ isInstallable: !!deferredPrompt, promptToInstall }}>
            {children}
        </PWAContext.Provider>
    );
};
