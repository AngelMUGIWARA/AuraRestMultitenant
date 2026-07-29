import { apiClient } from "@maison/api-client";
import { AuthClient } from "@maison/auth-client";
import type { ApiResponse, PublicMenuResponseDto } from "@maison/types";

export const publicMenuService = {
  getPrintableMenu: (branchId?: string) => {
    const tenantSlug = AuthClient.getTenantSlug();

    if (!tenantSlug) {
      throw new Error("Tenant slug not found");
    }
    console.log('Tenant slug:', tenantSlug);
console.log('Branch ID:', branchId);

    return apiClient.get<ApiResponse<PublicMenuResponseDto>>(
      `/public/menu/${tenantSlug}`,
      {
        params:
          branchId && branchId !== "global" ? { branch: branchId } : undefined,
      },
    );
  },
};
