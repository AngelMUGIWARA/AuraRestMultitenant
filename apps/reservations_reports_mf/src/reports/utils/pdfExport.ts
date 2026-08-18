import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  SalesReport,
  ProductsReport,
  PaymentsReport,
  PeakHoursReport,
} from "@maison/types";

interface ExportPdfParams {
  sales: SalesReport | null;
  products: ProductsReport | null;
  payments: PaymentsReport | null;
  peakHours: PeakHoursReport | null;
}

const GOLD: [number, number, number] = [201, 168, 76];
const INK: [number, number, number] = [24, 24, 24];
const MUTED: [number, number, number] = [110, 110, 110];
const CREAM: [number, number, number] = [250, 247, 240];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function drawFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
      14,
      h - 10,
    );
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 10, { align: "right" });
  }
}

export function exportReportsToPdf({
  sales,
  products,
  payments,
  peakHours,
}: ExportPdfParams): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const period = `${formatDate(sales?.startDate)} a ${formatDate(sales?.endDate)}`;

  // ── Encabezado de marca ──
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageWidth, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("MAISON", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("Reporte de Operaciones", 14, 28);
  doc.setFontSize(9);
  doc.text(`Período: ${period}`, 14, 35);

  let y = 46;

  // ── Resumen de ventas ──
  if (sales?.summary) {
    const totalOrders = sales.summary.totalOrders ?? 0;
    const soldUnits =
      products?.topProducts.reduce((sum, p) => sum + (p.totalQuantity ?? 0), 0) ?? 0;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Resumen de ventas"]],
      body: [
        ["Ingresos totales", formatCurrency(sales.summary.totalRevenue ?? 0)],
        ["Total de órdenes", String(totalOrders)],
        ["Promedio por orden", formatCurrency(sales.summary.averageOrderValue ?? 0)],
        ["Productos vendidos", String(soldUnits)],
      ],
      headStyles: {
        fillColor: GOLD,
        textColor: [20, 20, 20],
        fontStyle: "bold",
        fontSize: 10,
        halign: "left",
      },
      bodyStyles: { fontSize: 9, textColor: INK },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: "bold", textColor: MUTED },
        1: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
    });
    y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  } else {
    y += 8;
  }

  // ── Productos más vendidos ──
  if (products?.topProducts.length) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["#", "Producto", "Categoría", "Cantidad", "Ingresos"]],
      body: products.topProducts.slice(0, 12).map((p, i) => [
        String(i + 1),
        p.name,
        p.category ?? "—",
        String(p.totalQuantity ?? 0),
        formatCurrency(p.totalRevenue ?? 0),
      ]),
      headStyles: { fillColor: GOLD, textColor: [20, 20, 20], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
    });
    y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  } else {
    y += 8;
  }

  // ── Métodos de pago ──
  if (payments?.byMethod.length) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Método de pago", "Pagos", "Monto", "%"]],
      body: payments.byMethod.map((m) => [
        m.method,
        String(m.count ?? 0),
        formatCurrency(m.amount ?? 0),
        `${m.percentage ?? 0}%`,
      ]),
      headStyles: { fillColor: GOLD, textColor: [20, 20, 20], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right", fontStyle: "bold" },
        3: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
    });
    y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  } else {
    y += 8;
  }

  // ── Horarios de mayor actividad ──
  if (peakHours?.byHour.length) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Horario", "Órdenes", "Ingresos"]],
      body: peakHours.byHour.slice(0, 12).map((h) => [
        h.label,
        String(h.orders ?? 0),
        formatCurrency(h.revenue ?? 0),
      ]),
      headStyles: { fillColor: GOLD, textColor: [20, 20, 20], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
    });
  }

  // ── Marca de agua / firma ──
  const finalY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  doc.setFontSize(8);
  doc.setTextColor(...CREAM);
  doc.setFont("helvetica", "bold");
  doc.text("MAISON", pageWidth - 14, finalY + 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Reporte generado por el sistema de gestión", pageWidth - 14, finalY + 17, { align: "right" });

  drawFooter(doc);

  const start = sales?.startDate?.slice(0, 10) ?? "periodo";
  const end = sales?.endDate?.slice(0, 10) ?? "";
  doc.save(`reporte_${start}_${end}.pdf`);
}
