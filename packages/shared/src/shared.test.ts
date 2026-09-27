import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  formatMoney,
  isApiErrorResponse,
  ORDER_STATUSES,
  SHIPMENT_STATUSES,
} from './index.js';

describe('contract enums', () => {
  it('exposes contract enum values at runtime', () => {
    expect(ORDER_STATUSES).toContain('PENDING_PAYMENT');
    expect(SHIPMENT_STATUSES).toContain('IN_HUB_HOLDING');
    expect(new Set(ORDER_STATUSES).size).toBe(ORDER_STATUSES.length);
  });
});

describe('formatMoney', () => {
  it('formats kobo as naira', () => {
    // 520000 kobo is the contract example value (₦5,200.00)
    expect(formatMoney({ amount: 520000, currency: 'NGN' })).toMatch(/5,200\.00/);
  });

  it('rejects non-integer or negative minor units', () => {
    expect(() => formatMoney({ amount: 10.5, currency: 'NGN' })).toThrow(RangeError);
    expect(() => formatMoney({ amount: -1, currency: 'NGN' })).toThrow(RangeError);
  });
});

describe('isApiErrorResponse', () => {
  it('accepts the contract ErrorResponse shape', () => {
    expect(
      isApiErrorResponse({ error: { code: ERROR_CODES.NOT_FOUND, message: 'x', requestId: 'r' } }),
    ).toBe(true);
  });

  it('rejects other payloads', () => {
    expect(isApiErrorResponse({ data: {} })).toBe(false);
    expect(isApiErrorResponse({ error: { code: 'X', message: 'x' } })).toBe(false);
    expect(isApiErrorResponse(null)).toBe(false);
  });
});
