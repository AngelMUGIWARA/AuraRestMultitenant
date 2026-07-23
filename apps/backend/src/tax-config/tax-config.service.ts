import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';

/**
 * Default tax rate used when no branch-specific configuration exists.
 *
 * Historical evidence:
 *   - Backend orders.service.ts ALWAYS used Prisma.Decimal(0.15)
 *   - Test mock data persists subtotal=85.00, tax=12.75 → 12.75/85 = 0.15
 *   - The cashier MFE's 0.16 back-calculation (cartTotal/1.16) was a display bug
 *     using tax-inclusive math against tax-exclusive prices.
 *   - Original seed files used 0.16 which was inconsistent with the backend.
 *
 * Policy: tax-EXCLUSIVE. Menu item prices do NOT include tax.
 * Tax = subtotal × rate. Total = subtotal + tax.
 *
 * Rounding policy (implemented in orders.service.ts):
 *   - Per-line subtotal: Prisma.Decimal(unitPrice).mul(quantity).toFixed(2)
 *   - Order subtotal: Decimal sum of line subtotals (no intermediate rounding)
 *   - Tax: Decimal subtotal × Decimal taxRate → .toFixed(2)
 *   - Total: Decimal subtotal + Decimal tax → .toFixed(2)
 *   - All monetary values stored as Decimal(10,2) in the database
 *   - The 2-decimal rounding happens at the FINAL step only (tax and total),
 *     not per line item subtotal (which is exact since unitPrice * qty is integer).
 *
 * Payments behavior (payments.service.ts):
 *   - Payments do NOT recalculate tax. They read order.total from DB.
 *   - Validates: incomingAmount == order.total - sum(alreadyPaid)
 *   - Supports split payments and partial payments via idempotency
 */
export const DEFAULT_TAX_RATE = 0.15;
const TAX_RATE_KEY = 'tax_rate';

@Injectable()
export class TaxConfigService {
  private readonly logger = new Logger(TaxConfigService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Returns the tax rate for the given branch.
   *
   * Semantics:
   *   A. No branchId provided → returns DEFAULT_TAX_RATE (documented fallback)
   *   B. Settings row found with valid value → returns the configured rate
   *   C. Settings row found with INVALID value → throws BadRequestException
   *   D. Database error → throws BadGatewayException (never silent fallback)
   *
   * Valid rate: finite number, 0 <= rate < 1 (e.g., 0.15 = 15%)
   * Rate must be decimal fraction, NOT percentage (0.16, not 16, not 1.16).
   */
  async getTaxRate(schemaName: string, branchId?: string): Promise<number> {
    if (!branchId) {
      return DEFAULT_TAX_RATE;
    }

    let setting: { value: string } | null;
    try {
      const client = this.tenantPrisma.getClient(schemaName);
      setting = await client.settings.findUnique({
        where: { branchId_key: { branchId, key: TAX_RATE_KEY } },
      });
    } catch (err) {
      this.logger.error(
        `Database error reading tax rate for branch ${branchId}: ${err}`,
      );
      throw new BadGatewayException(
        'Error al leer la configuración fiscal de la base de datos',
      );
    }

    if (!setting) {
      return DEFAULT_TAX_RATE;
    }

    const rate = Number(setting.value);

    if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
      this.logger.error(
        `Invalid tax rate value "${setting.value}" for branch ${branchId}. ` +
        `Expected decimal fraction 0 <= rate < 1.`,
      );
      throw new BadRequestException(
        `Valor de tasa fiscal inválido "${setting.value}" para la sucursal ` +
        `${branchId}. Se esperaba un decimal entre 0 y 1 (ej. 0.15 = 15%).`,
      );
    }

    return rate;
  }
}
