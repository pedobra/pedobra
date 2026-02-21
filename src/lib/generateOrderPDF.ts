import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

export interface CompanySettings {
    company_name: string;
    cnpj?: string;
    address_street?: string;
    address_number?: string;
    address_neighborhood?: string;
    address_city?: string;
    address_state?: string;
    address_cep?: string;
    logo_url?: string;
    pdf_show_site_address?: boolean;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

function getOrderRef(order: any): string {
    if (!order || !order.created_at) return 'N/A';
    const d = new Date(order.created_at);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const seq = String(order.seq_number || 0).padStart(4, '0');
    return `${dd}${mm}_${seq}`;
}

export async function generateOrderPDF(order: any, requestedByName?: string) {
    // Fetch company settings
    const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .single();

    const settings: CompanySettings = settingsData || { company_name: 'PedObra' };

    const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // ─── HEADER ─────────────────────────────────────────────────────────
    // Left: Logo
    let logoY = 14;
    let logoH = 20;
    if (settings.logo_url) {
        const base64 = await loadImageAsBase64(settings.logo_url);
        if (base64) {
            try {
                doc.addImage(base64, 'PNG', margin, logoY, 40, logoH);
            } catch {
                // Logo load failed — skip
            }
        }
    } else {
        // fallback text brand
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 215, 0);
        doc.text(settings.company_name || 'PedObra', margin, logoY + 14);
        doc.setTextColor(0, 0, 0);
    }

    // Right: "PEDIDO" title block
    const ref = getOrderRef(order);
    const creator = requestedByName || order.profiles?.name || order.sites?.name || '—';
    const createdAt = new Date(order.created_at).toLocaleString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 23);
    doc.text('PEDIDO', pageWidth - margin, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Nº ${ref}`, pageWidth - margin, 27, { align: 'right' });
    doc.text(`Data: ${createdAt}`, pageWidth - margin, 32, { align: 'right' });
    doc.text(`Criado por: ${creator}`, pageWidth - margin, 37, { align: 'right' });

    let headerBottomY = 44;
    if (order.sites?.name && settings.pdf_show_site_address !== false) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(`Obra: ${order.sites.name}`, pageWidth - margin, 42, { align: 'right' });
        headerBottomY = 47;

        // Site address (address.full) if available
        const siteAddress = order.sites?.address?.full || order.sites?.address;
        const siteCep = order.sites?.address?.cep;
        if (siteAddress && typeof siteAddress === 'string') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const addrLine = siteCep ? `${siteAddress} — CEP ${siteCep}` : siteAddress;
            doc.text(addrLine, pageWidth - margin, 52, { align: 'right' });
            headerBottomY = 57;
        }
    }

    // Header divider line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, headerBottomY + 2, pageWidth - margin, headerBottomY + 2);

    // ─── BODY TABLE ─────────────────────────────────────────────────────
    const items = order.items || [];
    const tableBody = items.map((item: any, idx: number) => [
        idx + 1,
        item.name || '—',
        item.unit || 'un',
        item.quantity,
    ]);

    autoTable(doc, {
        head: [['#', 'MATERIAL / INSUMO', 'UN.', 'QTDE.']],
        body: tableBody,
        startY: headerBottomY + 8,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 5,
            textColor: [20, 20, 23],
            lineColor: [220, 220, 220],
            lineWidth: 0.3,
        },
        headStyles: {
            fillColor: [20, 20, 23],
            textColor: [255, 215, 0],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // ─── FOOTER ─────────────────────────────────────────────────────────
    const footerY = pageHeight - 14;
    doc.setLineWidth(0.3);
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 23);
    doc.text(settings.company_name || '', margin, footerY - 3);

    const addressParts = [
        settings.address_street,
        settings.address_number,
        settings.address_neighborhood,
        settings.address_city,
        settings.address_state,
        settings.address_cep,
    ].filter(Boolean);

    if (addressParts.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(addressParts.join(', '), margin, footerY + 2);
    }

    // Page number at right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Documento gerado automaticamente — ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, footerY + 2, { align: 'right' });

    // ─── SAVE ───────────────────────────────────────────────────────────
    doc.save(`pedido_${ref}.pdf`);
}
