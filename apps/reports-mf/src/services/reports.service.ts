import { apiClient } from "@maison/api-client";
import type {
  SalesReport,
  ProductsReport,
  PaymentsReport,
  PeakHoursReport,
} from "@maison/types";

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
}

export const reportsService = {
  getSalesReport: (params?: ReportQueryParams) =>
    apiClient.get<SalesReport>("/admin/reports/sales", {
      params: params as Record<string, string | undefined>,
    }),

  getProductsReport: (params?: ReportQueryParams) =>
    apiClient.get<ProductsReport>("/admin/reports/products", {
      params: params as Record<string, string | undefined>,
    }),

  getPaymentsReport: (params?: ReportQueryParams) =>
    apiClient.get<PaymentsReport>("/admin/reports/payments", {
      params: params as Record<string, string | undefined>,
    }),

  getPeakHoursReport: (params?: ReportQueryParams) =>
    apiClient.get<PeakHoursReport>("/admin/reports/peak-hours", {
      params: params as Record<string, string | undefined>,
    }),
};
