import { apiClient } from "@maison/api-client";
import type {
  ApiResponse,
  KitchenTicket,
  KitchenTicketStatus,
} from "@maison/types";

export const kitchenService = {
  getQueue: (branchId?: string) =>
    apiClient.get<KitchenTicket[]>("/kitchen/tickets", { params: { branchId } }),
  // Updated to include required version (optimistic locking) and optional reason
  updateTicketStatus: (
    ticketId: string,
    payload: { status: KitchenTicketStatus; version: number; reason?: string },
  ) =>
    apiClient.patch<ApiResponse<KitchenTicket>>(
      `/kitchen/tickets/${ticketId}/status`,
      payload,
    ),
};
