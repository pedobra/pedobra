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

async function loadImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        const format = blob.type.split('/')[1]?.toUpperCase() || 'PNG';
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ 
                data: reader.result as string, 
                format: format === 'VND.MICROSOFT.ICON' ? 'PNG' : format
            });
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
    const [settingsRes, userRes] = await Promise.all([
        supabase.from('company_settings').select('*').single(),
        supabase.auth.getUser()
    ]);

    const settings: CompanySettings = settingsRes.data || { company_name: 'PedObra' };
    const adminEmail = userRes.data.user?.email || '—';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const ref = getOrderRef(order);
    const creator = requestedByName || order.profiles?.name || order.sites?.name || '—';
    const createdAt = new Date(order.created_at).toLocaleString('pt-BR');
    
    const statusMap: Record<string, string> = {
        new: 'NOVO', pending: 'PENDENTE', approved: 'APROVADO', denied: 'NEGADO',
        'não autorizado': 'NEGADO', completed: 'CONCLUÍDO', partial: 'PARCIAL',
        'rec. parcial': 'PARCIAL', authorized: 'AUTORIZADO'
    };
    const displayStatus = (statusMap[order.status] || order.status).toUpperCase();
    const isNew = order.status === 'new' || order.status === 'novo';

    if (settings.logo_url) {
        let finalLogoUrl = settings.logo_url;
        if (!settings.logo_url.startsWith('http') && !settings.logo_url.startsWith('data:')) {
            const { data: signed } = await supabase.storage.from('secure-assets').createSignedUrl(settings.logo_url, 60);
            if (signed?.signedUrl) finalLogoUrl = signed.signedUrl;
        }

        const imgData = await loadImageAsBase64(finalLogoUrl);
        if (imgData) try { doc.addImage(imgData.data, imgData.format, margin, 12, 40, 20, undefined, 'FAST'); } catch (e) { console.error('PDF Logo:', e); }
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(settings.company_name, margin, 25);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('PEDIDO', pageWidth - margin, 20, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${ref}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Status: ${displayStatus}`, pageWidth - margin, 33, { align: 'right' });
    doc.text(`Data: ${createdAt}`, pageWidth - margin, 38, { align: 'right' });
    doc.text(`Solicitante: ${creator}`, pageWidth - margin, 43, { align: 'right' });

    let nextY = 48;
    if (order.sites?.name) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Obra: ${order.sites.name}`, pageWidth - margin, nextY, { align: 'right' });
        nextY += 5;

        if (settings.pdf_show_site_address !== false) {
            const siteAddress = order.sites?.address?.full || order.sites?.address;
            if (siteAddress && typeof siteAddress === 'string') {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(60, 60, 60);
                doc.text(siteAddress, pageWidth - margin, nextY, { align: 'right' });
                nextY += 6;
            }
        }
    }

    const head = isNew 
        ? [['#', 'MATERIAL / INSUMO', 'UN.', 'QTDE.']]
        : [['#', 'MATERIAL / INSUMO', 'FORNECEDOR', 'UN.', 'QTDE.', 'V. UNIT.', 'TOTAL']];

    const body = (order.items || []).map((it: any, i: number) => {
        if (isNew) return [i + 1, it.name || '—', it.unit || '—', it.quantity];
        const val = typeof it.unit_value === 'string' ? (parseFloat(it.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0) : (it.unit_value || 0);
        const qty = parseFloat(it.received_quantity) || parseFloat(it.quantity) || 0;
        return [
            i + 1, it.name || '—', it.supplier || '—', it.unit || '—', it.quantity,
            val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            (val * qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        ];
    });

    autoTable(doc, {
        head, body, startY: nextY + 4, margin: { left: margin, right: margin },
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], font: 'helvetica' },
        headStyles: { fillColor: [210, 210, 210], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [242, 242, 242] },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } },
        didDrawPage: () => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(110, 110, 110);
            
            const fY = pageHeight - 10;
            const companyAddr = [settings.address_street, settings.address_number, settings.address_neighborhood, settings.address_city, settings.address_state, settings.address_cep].filter(Boolean).join(', ');
            
            doc.setFont('helvetica', 'bold');
            doc.text(`${adminEmail}`, margin, fY - 3);
            doc.setFont('helvetica', 'normal');
            doc.text(`${settings.company_name} — ${companyAddr}`, margin, fY);
            
            doc.setFont('helvetica', 'italic');
            const footerRight = `Pedido gerado por WWW.PEDOBRAAPP.COM em ${new Date().toLocaleDateString('pt-BR')}`;
            doc.text(footerRight, pageWidth - margin, fY, { align: 'right' });
        }
    });

    if (!isNew) {
        const grandTotal = (order.items || []).reduce((acc: number, it: any) => {
            const val = typeof it.unit_value === 'string' ? (parseFloat(it.unit_value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0) : (it.unit_value || 0);
            const qty = parseFloat(it.received_quantity) || parseFloat(it.quantity) || 0;
            return acc + (val * qty);
        }, 0);

        const lastY = (doc as any).lastAutoTable.finalY;
        doc.setFillColor(210, 210, 210);
        doc.rect(pageWidth - margin - 60, lastY + 2, 60, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`TOTAL: R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, lastY + 8.5, { align: 'right' });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(110, 110, 110);
        doc.text(`  —  Página ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`pedido_${ref}.pdf`);
}
