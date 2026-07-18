/** Shared status/error toast for admin pages. Renders via the Popover API so it
 * always paints above an open native `<dialog>` (top-layer stacking follows
 * promotion recency), with a fallback for browsers without Popover support. */

export type AdminToastKind = 'neutral' | 'error' | 'success';

type PopoverCapableEl = HTMLElement & {
	showPopover?: () => void;
	hidePopover?: () => void;
};

export function initAdminToast(
	toastEl: PopoverCapableEl | null,
	messageEl: HTMLElement | null,
	closeBtn: HTMLButtonElement | null,
): (msg: string, kind?: AdminToastKind) => void {
	const supportsPopover = typeof toastEl?.showPopover === 'function';
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	function setStatus(msg: string, kind: AdminToastKind = 'neutral') {
		if (!toastEl || !messageEl) return;
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}
		if (!msg) {
			toastEl.removeAttribute('data-kind');
			if (supportsPopover) {
				if (toastEl.matches(':popover-open')) toastEl.hidePopover?.();
			} else {
				toastEl.hidden = true;
			}
			return;
		}
		messageEl.textContent = msg;
		toastEl.dataset.kind = kind;
		toastEl.setAttribute('role', kind === 'error' ? 'alert' : 'status');
		toastEl.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
		if (supportsPopover) {
			if (toastEl.matches(':popover-open')) toastEl.hidePopover?.();
			toastEl.showPopover?.();
		} else {
			toastEl.hidden = false;
		}
		if (kind === 'success') {
			dismissTimer = setTimeout(() => {
				dismissTimer = null;
				setStatus('');
			}, 4000);
		}
	}

	closeBtn?.addEventListener('click', () => setStatus(''));

	return setStatus;
}
