export const maskCEP = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
};

export const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
};

export const maskCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 18);
};

export const maskCPF_CNPJ = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 11) return maskCPF(value);
    return maskCNPJ(value);
};

export const maskPhone = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 10) {
        // (00) 0000-0000
        return raw
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 14);
    } else {
        // (00) 00000-0000
        return raw
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);
    }
};

export const maskCurrency = (value: string | number) => {
    if (typeof value === 'number') {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    
    let v = value.replace(/\D/g, '');
    v = (Number(v) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    return v;
};

// Helper to unmask currency back to number
export const parseCurrencyToNumber = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(value.replace(/\D/g, '')) / 100;
};
