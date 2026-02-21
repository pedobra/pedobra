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

export async function generateHistoryOrderPDF(order: any, requestedByName?: string, childOrder?: any) {
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

    // Right: "HISTÓRICO" title block
    const ref = getOrderRef(order);
    const creator = requestedByName || order.profiles?.name || order.sites?.name || '—';
    const createdAt = new Date(order.created_at).toLocaleString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 23);
    doc.text('HISTÓRICO DO PEDIDO', pageWidth - margin, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Nº ${ref}`, pageWidth - margin, 27, { align: 'right' });
    doc.text(`Criado em: ${createdAt}`, pageWidth - margin, 32, { align: 'right' });
    doc.text(`Criado por: ${creator}`, pageWidth - margin, 37, { align: 'right' });

    let headerBottomY = 44;

    // Status history info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (order.approved_by_name && order.approved_at) {
        doc.text(`Aprovado por: ${order.approved_by_name} em ${new Date(order.approved_at).toLocaleString('pt-BR')}`, margin, headerBottomY);
        headerBottomY += 5;
    }
    if (order.received_by_name && order.received_at) {
        doc.text(`Recebido por: ${order.received_by_name} em ${new Date(order.received_at).toLocaleString('pt-BR')}`, margin, headerBottomY);
        headerBottomY += 5;
    }

    if (order.sites?.name && settings.pdf_show_site_address !== false) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(`Obra: ${order.sites.name}`, pageWidth - margin, headerBottomY - 2, { align: 'right' });
        headerBottomY += 3;

        // Site address (address.full) if available
        const siteAddress = order.sites?.address?.full || order.sites?.address;
        const siteCep = order.sites?.address?.cep;
        if (siteAddress && typeof siteAddress === 'string') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const addrLine = siteCep ? `${siteAddress} — CEP ${siteCep}` : siteAddress;
            doc.text(addrLine, pageWidth - margin, headerBottomY + 2, { align: 'right' });
            headerBottomY += 7;
        }
    }

    // Header divider line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, headerBottomY + 2, pageWidth - margin, headerBottomY + 2);

    // ─── BODY TABLE ─────────────────────────────────────────────────────
    const items = order.items || [];
    const tableBody = items.map((item: any, idx: number) => {
        const qty = parseFloat(item.quantity) || 0;
        const rec = parseFloat(item.received_quantity) || 0;
        const missing = qty - rec;
        return [
            idx + 1,
            item.name || '—',
            item.unit || 'un',
            qty.toString(),
            rec.toString(),
            missing > 0 ? missing.toString() : '-'
        ];
    });

    autoTable(doc, {
        head: [['#', 'MATERIAL / INSUMO', 'UN.', 'SOLICIT.', 'RECEBIDO', 'FALTA']],
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
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center', textColor: [39, 174, 96], fontStyle: 'bold' },
            5: { cellWidth: 18, halign: 'center', textColor: [231, 76, 60], fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // ─── CHILD ORDER BOX ────────────────────────────────────────────────
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    if (childOrder) {
        let boxHeight = 25 + (childOrder.items?.length || 0) * 7;
        if (childOrder.status === 'completed' && childOrder.received_at) {
            boxHeight += 18;
        }

        // Draw Box (similar look to the web UI)
        doc.setFillColor(248, 252, 248);
        doc.setDrawColor(220, 230, 220);
        doc.roundedRect(margin, finalY, pageWidth - (margin * 2), boxHeight, 3, 3, 'FD');

        // Draw Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text('PEDIDO COMPLEMENTAR GERADO AUTOMÁTICO', margin + 6, finalY + 8);

        // Status pill
        doc.setFontSize(8);
        let childStatusLabel = 'PENDENTE';
        let childStatusColor = [243, 156, 18];
        if (childOrder.status === 'completed') { childStatusLabel = 'CONCLUÍDO'; childStatusColor = [39, 174, 96]; }
        else if (childOrder.status === 'approved') { childStatusLabel = 'APROVADO'; childStatusColor = [52, 199, 89]; }
        else if (childOrder.status === 'partial') { childStatusLabel = 'REC. PARCIAL'; childStatusColor = [243, 156, 18]; }
        else if (childOrder.status === 'denied') { childStatusLabel = 'NEGADO'; childStatusColor = [255, 59, 48]; }

        const textWidth = doc.getTextWidth(childStatusLabel);
        doc.setDrawColor(childStatusColor[0], childStatusColor[1], childStatusColor[2]);
        doc.setFillColor(255, 255, 255); // White bg with colored border, like UI pill. Or solid bg with white text:
        // Let's do very light tint with colored text: 
        doc.roundedRect(pageWidth - margin - 8 - textWidth, finalY + 4, textWidth + 6, 6, 3, 3, 'S');
        doc.setTextColor(childStatusColor[0], childStatusColor[1], childStatusColor[2]);
        doc.text(childStatusLabel, pageWidth - margin - 5 - (textWidth / 2), finalY + 8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text(`Identificador do novo pedido (contém sobras pendentes): `, margin + 6, finalY + 14);
        doc.setFont('helvetica', 'bold');
        doc.text(`#${getOrderRef(childOrder)}`, margin + 6 + doc.getTextWidth(`Identificador do novo pedido (contém sobras pendentes): `), finalY + 14);

        let listY = finalY + 22;
        childOrder.items?.forEach((it: any) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            const itemNameStr = `• ${it.quantity} ${it.unit} -`;
            doc.text(itemNameStr, margin + 8, listY);

            doc.setFont('helvetica', 'normal');
            doc.text(` ${it.name.replace(`[COMPLEMENTO REF ${getOrderRef(order)}]`, '').trim()}`, margin + 8 + doc.getTextWidth(itemNameStr), listY);
            listY += 6;
        });

        if (childOrder.status === 'completed' && childOrder.received_at) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.line(margin + 6, listY, pageWidth - margin - 6, listY);
            listY += 6;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            const reqByPrefix = 'Recebido por:  ';
            doc.text(reqByPrefix, margin + 6, listY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(110, 110, 110);
            doc.text(` ${childOrder.received_by_name || 'Desconhecido'}`, margin + 6 + doc.getTextWidth(reqByPrefix), listY);

            listY += 5;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            const datePrefix = 'Data da conclusão:  ';
            doc.text(datePrefix, margin + 6, listY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(110, 110, 110);
            doc.text(` ${new Date(childOrder.received_at).toLocaleString('pt-BR')}`, margin + 6 + doc.getTextWidth(datePrefix), listY);
        }
    }

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
    doc.save(`Histórico_${ref}.pdf`);
}
