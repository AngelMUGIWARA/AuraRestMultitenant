import jsPDF from "jspdf";
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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function exportReportsToPdf({
  sales,
  products,
  payments,
  peakHours,
}: ExportPdfParams): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("Reporte de Operaciones", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Período: ${sales?.startDate ?? "—"} a ${sales?.endDate ?? "—"}`,
    14,
    y,
  );
  y += 12;

  // ── Resumen de ventas ──
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Resumen de Ventas", 14, y);
  y += 8;

  doc.setFontSize(10);
  const summaryRows = [
    ["Total de órdenes", String(sales?.summary.totalOrders ?? 0)],
    ["Ingresos totales", formatCurrency(sales?.summary.totalRevenue ?? 0)],
    [
      "Promedio por orden",
      formatCurrency(sales?.summary.averageOrderValue ?? 0),
    ],
  ];
  summaryRows.forEach(([label, value]) => {
    doc.text(label, 14, y);
    doc.text(value, 100, y);
    y += 6;
  });
  y += 8;

  // ── Productos más vendidos ──
  doc.setFontSize(14);
  doc.text("Productos Más Vendidos", 14, y);
  y += 8;

  doc.setFontSize(10);
  (products?.topProducts ?? []).slice(0, 10).forEach((p) => {
    doc.text(`${p.name} (${p.category})`, 14, y);
    doc.text(
      `${p.totalQuantity} uds — ${formatCurrency(p.totalRevenue)}`,
      120,
      y,
    );
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  y += 8;

  // ── Métodos de pago ──
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(14);
  doc.text("Métodos de Pago", 14, y);
  y += 8;

  doc.setFontSize(10);
  (payments?.byMethod ?? []).forEach((m) => {
    doc.text(m.method, 14, y);
    doc.text(
      `${m.count} pagos — ${formatCurrency(m.amount)} (${m.percentage}%)`,
      80,
      y,
    );
    y += 6;
  });
  y += 8;

  // ── Horarios pico ──
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(14);
  doc.text("Horarios de Mayor Actividad", 14, y);
  y += 8;

  doc.setFontSize(10);
  (peakHours?.byHour ?? []).slice(0, 10).forEach((h) => {
    doc.text(h.label, 14, y);
    doc.text(`${h.orders} órdenes — ${formatCurrency(h.revenue)}`, 80, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const filename = `reporte_${sales?.startDate ?? "periodo"}_${sales?.endDate ?? ""}.pdf`;
  doc.save(filename);
}
