import type { Money } from './contract.js';

/** Number of minor units per major unit, per contract currency. NGN: 100 kobo = ₦1. */
export const MINOR_UNITS_PER_MAJOR: Readonly<Record<Money['currency'], number>> = {
  NGN: 100,
};

/**
 * Format a contract `Money` value (integer minor units) for display.
 * Display only — never use the formatted string for arithmetic.
 */
export function formatMoney(money: Money, locale = 'en-NG'): string {
  if (!Number.isSafeInteger(money.amount) || money.amount < 0) {
    throw new RangeError('Money.amount must be a non-negative safe integer in minor units');
  }
  const divisor = MINOR_UNITS_PER_MAJOR[money.currency];
  return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency }).format(
    money.amount / divisor,
  );
}
