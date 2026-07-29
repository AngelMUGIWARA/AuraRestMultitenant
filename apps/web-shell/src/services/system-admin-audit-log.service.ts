import { systemAdminApi } from '@/lib/system-admin-api';
import type { SystemAuditLogEntry } from '@maison/types';

export const systemAdminAuditLogService = {
  getAll: () => systemAdminApi.get<SystemAuditLogEntry[]>('/system-admin/audit-logs'),
};
