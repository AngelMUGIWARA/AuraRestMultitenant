import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class ReceiptNumberService {
  private static readonly SEQUENCE_ID = 'receipt_folio';
  private static readonly FOLIO_PREFIX = 'TKT';
  private static readonly FOLIO_PADDING = 6;

  async reserveFolio(
    schemaName: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const sequence = await (tx as any).receiptSequence.upsert({
      where: { id: ReceiptNumberService.SEQUENCE_ID },
      create: {
        id: ReceiptNumberService.SEQUENCE_ID,
        value: 1,
      },
      update: {
        value: { increment: 1 },
      },
    });

    return this.formatFolio(sequence.value);
  }

  formatFolio(value: number): string {
    return `${ReceiptNumberService.FOLIO_PREFIX}-${String(value).padStart(
      ReceiptNumberService.FOLIO_PADDING,
      '0',
    )}`;
  }
}
