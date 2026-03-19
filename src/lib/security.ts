import DOMPurify from 'dompurify';
import { z } from 'zod';
import { useState, useCallback, useEffect } from 'react';

// ==========================================
// 1. Sanitização Contra XSS (DOMPurify)
// ==========================================
/**
 * Sanitiza inputs de texto livre para evitar injeção de scripts (XSS).
 * Deve ser usado em observações, descrições e qualquer conteúdo que
 * venha do usuário e não possua restrição rígida de caracteres.
 */
export const sanitizeInput = (dirty: string | null | undefined): string => {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty.trim(), {
        ALLOWED_TAGS: [], // Remove TODAS as tags HTML por padrão
        ALLOWED_ATTR: []
    });
};

// ==========================================
// 2. Esquemas de Validação Estritos (Zod)
// ==========================================
export const securitySchemas = {
    // E-mail válido e normalizado em lowercase
    email: z.string().email('Email inválido.').transform(val => val.toLowerCase().trim()),
    
    // UUID v4 Padrão (Usado no Supabase Auth e refs de DB)
    uuid: z.string().uuid('Identificador inválido.'),
    
    // Texto comum curto sem tags (Nomes de canteiros, materiais, pessoas)
    textShort: z.string().min(1, 'Campo obrigatório.').max(150, 'Máximo de 150 caracteres.'),
    
    // Número positivo padrão
    positiveNumber: z.coerce.number().positive('O valor deve ser positivo.'),
};

// ==========================================
// 3. Prevenção Anti-Spam / Rate Limiting Frontend
// ==========================================
/**
 * Hook de Debounce para segurar múltiplos cliques rápidos.
 * Útil para botões de Submit ("Salvar Pedido" etc).
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

/**
 * Hook para travar requisições duplicadas.
 */
export const useRateLimit = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    
    const withRateLimit = useCallback(async (action: () => Promise<void>) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await action();
        } finally {
            // Um pequeno atraso extra antes de destravar o botão
            setTimeout(() => setIsProcessing(false), 300);
        }
    }, [isProcessing]);

    return { isProcessing, withRateLimit };
};

// ==========================================
// 4. Honeypot Anti-Bot (Camada Invisível de Segurança)
// ==========================================
/**
 * Campos Honeypot servem como isca digital. Humanos não veem, bots automatizados
 * rastreiam o DOM e preenchem tudo precipitadamente. Se o honeypot estiver
 * preenchido, abortamos o submit sem gerar log algum.
 */
export const detectBot = (honeypotValue: string | undefined): boolean => {
    if (honeypotValue && honeypotValue.length > 0) {
        console.warn('Comportamento anômalo detectado.');
        return true;
    }
    return false;
};

// ==========================================
// 5. Upload Seguro de Arquivos (Storage)
// ==========================================
export const validateFileUpload = (file: File, options?: { maxSizeMB?: number, allowedMimes?: string[] }) => {
    const maxSize = (options?.maxSizeMB || 5) * 1024 * 1024;
    const allowed = options?.allowedMimes || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
        throw new Error(`Arquivo excede o limite de ${options?.maxSizeMB || 5}MB.`);
    }

    if (!allowed.includes(file.type)) {
        throw new Error('Formato de arquivo não permitido por questões de segurança.');
    }

    return true;
};

/**
 * Gera um nome seguro baseado em UUID (impede previsibilidade e ataques de Path Traversal)
 */
export const generateSecureFileName = (originalName: string): string => {
    const ext = originalName.split('.').pop();
    const cleanExt = ext ? ext.replace(/[^a-zA-Z0-9]/g, '') : '';
    return `${crypto.randomUUID()}.${cleanExt}`;
};
