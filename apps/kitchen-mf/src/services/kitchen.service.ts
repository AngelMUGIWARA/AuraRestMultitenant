import { apiClient } from "@maison/api-client";
import type {
  ApiResponse,
  KitchenTicket,
  KitchenTicketStatus,
} from "@maison/types";

export const kitchenService = {
  getQueue: (branchId?: string) =>
    apiClient.get<KitchenTicket[]>("/kitchen/queue", { params: { branchId } }),
  updateTicketStatus: (ticketId: string, status: KitchenTicketStatus) =>
    apiClient.patch<ApiResponse<KitchenTicket>>(
      `/kitchen/tickets/${ticketId}/status`,
      { status },
    ),
};
