import { useState, useEffect } from "react";
import { reportsService, ReportQueryParams } from "../services/reports.service";
import type {
  SalesReport,
  ProductsReport,
  PaymentsReport,
  PeakHoursReport,
} from "@maison/types";

export interface ReportsData {
  sales: SalesReport | null;
  products: ProductsReport | null;
  payments: PaymentsReport | null;
  peakHours: PeakHoursReport | null;
}

export function useReportsData(params?: ReportQueryParams) {
  const [data, setData] = useState<ReportsData>({
    sales: null,
    products: null,
    payments: null,
    peakHours: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);
      setError(null);

      try {
        const [sales, products, payments, peakHours] = await Promise.all([
          reportsService.getSalesReport(params),
          reportsService.getProductsReport(params),
          reportsService.getPaymentsReport(params),
          reportsService.getPeakHoursReport(params),
        ]);

        if (!cancelled) {
          setData({ sales, products, payments, peakHours });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar reportes",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [params?.startDate, params?.endDate]);

  return { data, isLoading, error };
}
