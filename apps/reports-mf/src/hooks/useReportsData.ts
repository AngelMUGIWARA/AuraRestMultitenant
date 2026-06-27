import { useState, useEffect, useCallback } from "react";
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

  const fetchAll = useCallback(async (fetchParams?: ReportQueryParams) => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    try {
      const [sales, products, payments, peakHours] = await Promise.all([
        reportsService.getSalesReport(fetchParams),
        reportsService.getProductsReport(fetchParams),
        reportsService.getPaymentsReport(fetchParams),
        reportsService.getPeakHoursReport(fetchParams),
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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchAll(params);
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [params?.startDate, params?.endDate, fetchAll]);

  return { data, isLoading, error, refetch: fetchAll };
}
