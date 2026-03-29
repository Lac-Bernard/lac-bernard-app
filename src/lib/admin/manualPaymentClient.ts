/** Allowed values for manual (non-Stripe) payments — keep in sync with admin record-payment API. */
export const MANUAL_PAYMENT_METHODS = new Set(['e-transfer', 'cheque', 'cash', 'unknown']);

export function isValidManualPaymentAmount(amount: number): boolean {
	return !Number.isNaN(amount) && amount >= 0;
}
