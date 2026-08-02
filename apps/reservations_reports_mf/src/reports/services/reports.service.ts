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

  exportCsv: async (
    type: "sales" | "products" | "payments" | "peak-hours",
    params?: ReportQueryParams,
  ): Promise<void> => {
    const queryParams = new URLSearchParams({
      type,
      ...(params?.startDate && { startDate: params.startDate }),
      ...(params?.endDate && { endDate: params.endDate }),
    });

    const token = localStorage.getItem("maison_access_token");
    const tenantSlug = token
      ? JSON.parse(atob(token.split(".")[1])).tenantSlug
      : "";

    const apiUrl =
      (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
      "http://localhost:4000/api/v1";

    const response = await fetch(
      `${apiUrl}/admin/reports/export?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,

          "x-tenant-slug": tenantSlug,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Error al exportar el reporte");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      response.headers
        .get("content-disposition")
        ?.split("filename=")[1]
        ?.replace(/"/g, "") ?? `${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
