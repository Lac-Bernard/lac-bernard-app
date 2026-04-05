/**
 * Google Places autocomplete for lake address + manual fallback.
 * Keeps hidden `lake_civic_number` / `lake_street_name` as submission source of truth.
 */

export type LakeAddressPlacesStrings = {
	manualLink: string;
	noSuggestions: string;
	backToSearch: string;
	placesUnavailable: string;
};

export type LakeAddressPlacesInit = {
	locale: 'en' | 'fr';
	strings: LakeAddressPlacesStrings;
	/** Wraps the "Find your lake address" label + combobox; hidden when a Places pick is confirmed. */
	comboboxBlock: HTMLElement;
	/** "Search for an address" — visible only after a Places pick, to change the selection. */
	changeAddressToggle: HTMLButtonElement;
	searchInput: HTMLInputElement;
	suggestionsEl: HTMLUListElement;
	searchSection: HTMLElement;
	manualSection: HTMLElement;
	summaryEl: HTMLElement | null;
	/** Hidden inputs submitted with the form */
	civicHidden: HTMLInputElement;
	streetHidden: HTMLInputElement;
	sourceInput: HTMLInputElement;
	placeIdInput: HTMLInputElement;
	formattedInput: HTMLInputElement;
	manualToggle: HTMLButtonElement;
	backToggle: HTMLButtonElement | null;
	civicVisible: HTMLInputElement;
	streetVisible: HTMLInputElement;
	initialSource: string | null;
	initialPlaceId: string | null;
	initialFormatted: string | null;
	initialCivic: string;
	initialStreet: string;
};

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number): (...args: T) => void {
	let t: ReturnType<typeof setTimeout> | undefined;
	return (...args: T) => {
		if (t) clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}

function newSessionToken(): string {
	return crypto.randomUUID();
}

export function initLakeAddressPlacesUi(o: LakeAddressPlacesInit): void {
	let sessionToken = newSessionToken();
	let placesAvailable = true;
	let acAbort: AbortController | undefined;
	let lastSuggestions: { placeId: string; text: string }[] = [];
	let activeIndex = -1;

	const searchWrap = o.searchInput.parentElement;

	const setSuggestionsOpen = (open: boolean) => {
		o.suggestionsEl.hidden = !open;
		o.searchInput.setAttribute('aria-expanded', open ? 'true' : 'false');
		searchWrap?.classList.toggle('lakeAddressSearchWrap--open', open);
		if (!open) {
			activeIndex = -1;
			o.searchInput.removeAttribute('aria-activedescendant');
			for (const el of o.suggestionsEl.querySelectorAll('.lakeAddressSuggestOption')) {
				el.classList.remove('lakeAddressSuggestOption--active');
				el.removeAttribute('aria-selected');
			}
		}
	};

	const setPlacesPickConfirmed = (confirmed: boolean) => {
		o.comboboxBlock.hidden = confirmed;
		o.changeAddressToggle.hidden = !confirmed;
		if (confirmed) {
			o.searchInput.value = '';
			setSuggestionsOpen(false);
		}
	};

	const clearPlacesPickAndShowSearch = () => {
		o.placeIdInput.value = '';
		o.formattedInput.value = '';
		o.sourceInput.value = '';
		o.civicHidden.value = '';
		o.streetHidden.value = '';
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
		setPlacesPickConfirmed(false);
		sessionToken = newSessionToken();
		o.searchInput.focus();
	};

	const highlightActive = () => {
		const opts = o.suggestionsEl.querySelectorAll<HTMLElement>('.lakeAddressSuggestOption');
		opts.forEach((el, i) => {
			const on = i === activeIndex;
			el.classList.toggle('lakeAddressSuggestOption--active', on);
			el.setAttribute('aria-selected', on ? 'true' : 'false');
			if (on) o.searchInput.setAttribute('aria-activedescendant', el.id);
		});
		if (activeIndex < 0) o.searchInput.removeAttribute('aria-activedescendant');
	};

	const showManual = () => {
		o.searchSection.hidden = true;
		o.manualSection.hidden = false;
		o.sourceInput.value = 'manual';
		o.placeIdInput.value = '';
		o.formattedInput.value = '';
		o.civicVisible.value = o.civicHidden.value;
		o.streetVisible.value = o.streetHidden.value;
		o.searchInput.value = '';
		o.suggestionsEl.innerHTML = '';
		lastSuggestions = [];
		setSuggestionsOpen(false);
		setPlacesPickConfirmed(false);
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
		syncManualToHidden();
		o.civicVisible.focus();
	};

	/** Empty state: clear stored address and show only the search field. */
	const clearAndShowSearch = () => {
		o.manualSection.hidden = true;
		o.searchSection.hidden = false;
		o.civicHidden.value = '';
		o.streetHidden.value = '';
		o.sourceInput.value = '';
		o.placeIdInput.value = '';
		o.formattedInput.value = '';
		o.civicVisible.value = '';
		o.streetVisible.value = '';
		o.searchInput.value = '';
		o.suggestionsEl.innerHTML = '';
		lastSuggestions = [];
		setSuggestionsOpen(false);
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
		setPlacesPickConfirmed(false);
		sessionToken = newSessionToken();
		o.searchInput.focus();
	};

	/** From manual mode: show search again without clearing hidden submission fields. */
	const showSearchFromManual = () => {
		o.manualSection.hidden = true;
		o.searchSection.hidden = false;
		o.civicVisible.value = '';
		o.streetVisible.value = '';
		const civic = o.civicHidden.value.trim();
		const street = o.streetHidden.value.trim();
		const fmt = o.formattedInput.value.trim();
		const isPlaces = o.sourceInput.value === 'places' && o.placeIdInput.value.trim() !== '';
		if (isPlaces && o.summaryEl) {
			const display = fmt || `${civic} ${street}`.trim();
			o.summaryEl.textContent = display;
			o.summaryEl.hidden = false;
			setPlacesPickConfirmed(true);
		} else {
			if (o.summaryEl) {
				o.summaryEl.textContent = '';
				o.summaryEl.hidden = true;
			}
			setPlacesPickConfirmed(false);
			o.searchInput.value = fmt || `${civic} ${street}`.trim();
		}
		o.suggestionsEl.innerHTML = '';
		lastSuggestions = [];
		setSuggestionsOpen(false);
		sessionToken = newSessionToken();
		o.searchInput.focus();
	};

	const syncManualToHidden = () => {
		o.civicHidden.value = o.civicVisible.value.trim();
		o.streetHidden.value = o.streetVisible.value.trim();
	};

	const showPlacesSummary = (civic: string, street: string, formatted: string) => {
		o.civicHidden.value = civic;
		o.streetHidden.value = street;
		o.sourceInput.value = 'places';
		const line = formatted || `${civic} ${street}`.trim();
		if (o.summaryEl) {
			o.summaryEl.textContent = line;
			o.summaryEl.hidden = false;
		}
		o.manualSection.hidden = true;
		o.searchSection.hidden = false;
		lastSuggestions = [];
		setSuggestionsOpen(false);
		setPlacesPickConfirmed(true);
	};

	const runAutocomplete = async (q: string) => {
		if (!placesAvailable || q.trim().length < 2) {
			o.suggestionsEl.innerHTML = '';
			lastSuggestions = [];
			setSuggestionsOpen(false);
			return;
		}
		acAbort?.abort();
		acAbort = new AbortController();
		try {
			const res = await fetch('/api/places/autocomplete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				signal: acAbort.signal,
				body: JSON.stringify({ input: q, sessionToken, locale: o.locale }),
			});
			if (res.status === 503) {
				placesAvailable = false;
				showManual();
				return;
			}
			if (!res.ok) {
				o.suggestionsEl.innerHTML = '';
				lastSuggestions = [];
				setSuggestionsOpen(false);
				return;
			}
			const data = (await res.json()) as { suggestions?: { placeId: string; text: string }[] };
			const sugs = data.suggestions ?? [];
			lastSuggestions = sugs.map((s) => ({ placeId: s.placeId, text: s.text }));
			activeIndex = -1;
			o.suggestionsEl.innerHTML = '';
			if (sugs.length === 0) {
				const li = document.createElement('li');
				li.className = 'lakeAddressSuggestHint';
				li.setAttribute('role', 'presentation');
				li.textContent = o.strings.noSuggestions;
				o.suggestionsEl.appendChild(li);
				setSuggestionsOpen(true);
				o.searchInput.removeAttribute('aria-activedescendant');
				return;
			}
			for (let i = 0; i < sugs.length; i++) {
				const s = sugs[i];
				const li = document.createElement('li');
				li.setAttribute('role', 'option');
				li.className = 'lakeAddressSuggestOption';
				li.id = `lake-address-sug-${i}`;
				li.textContent = s.text;
				li.setAttribute('aria-selected', 'false');
				li.tabIndex = -1;
				li.addEventListener('mousedown', (e) => e.preventDefault());
				li.addEventListener('click', () => void pickPlace(s.placeId));
				o.suggestionsEl.appendChild(li);
			}
			setSuggestionsOpen(true);
			highlightActive();
		} catch {
			if ((acAbort as AbortController).signal.aborted) return;
			o.suggestionsEl.innerHTML = '';
			lastSuggestions = [];
			setSuggestionsOpen(false);
		}
	};

	const pickPlace = async (placeId: string) => {
		o.suggestionsEl.innerHTML = '';
		lastSuggestions = [];
		setSuggestionsOpen(false);
		try {
			const res = await fetch('/api/places/details', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ placeId, sessionToken, locale: o.locale }),
			});
			if (res.status === 503) {
				placesAvailable = false;
				showManual();
				return;
			}
			if (!res.ok) {
				showManual();
				return;
			}
			const data = (await res.json()) as {
				ok?: boolean;
				lake_civic_number?: string | null;
				lake_street_name?: string | null;
				lake_formatted_address?: string | null;
				lake_google_place_id?: string | null;
			};
			if (!data.ok || !data.lake_civic_number || !data.lake_street_name) {
				showManual();
				return;
			}
			o.placeIdInput.value = data.lake_google_place_id ?? placeId;
			o.formattedInput.value = data.lake_formatted_address ?? '';
			showPlacesSummary(data.lake_civic_number, data.lake_street_name, data.lake_formatted_address ?? '');
			sessionToken = newSessionToken();
		} catch {
			showManual();
		}
	};

	const debouncedAuto = debounce((q: string) => void runAutocomplete(q), 320);

	o.manualToggle.addEventListener('click', () => {
		showManual();
	});

	o.changeAddressToggle.addEventListener('click', () => {
		clearPlacesPickAndShowSearch();
	});

	o.backToggle?.addEventListener('click', () => {
		showSearchFromManual();
	});

	o.civicVisible.addEventListener('input', syncManualToHidden);
	o.streetVisible.addEventListener('input', syncManualToHidden);

	o.searchInput.addEventListener('input', () => {
		const q = o.searchInput.value;
		debouncedAuto(q);
	});

	o.searchInput.addEventListener('focus', () => {
		if (o.searchInput.value.trim().length >= 2 && placesAvailable) {
			void runAutocomplete(o.searchInput.value);
		}
	});

	o.searchInput.addEventListener('keydown', (ev) => {
		if (o.suggestionsEl.hidden) {
			if (ev.key === 'ArrowDown' && o.searchInput.value.trim().length >= 2 && placesAvailable) {
				ev.preventDefault();
				void runAutocomplete(o.searchInput.value);
			}
			return;
		}
		const opts = o.suggestionsEl.querySelectorAll<HTMLElement>('.lakeAddressSuggestOption');
		const n = opts.length;
		if (n === 0) {
			if (ev.key === 'Escape') {
				ev.preventDefault();
				setSuggestionsOpen(false);
			}
			return;
		}
		if (ev.key === 'Escape') {
			ev.preventDefault();
			setSuggestionsOpen(false);
			return;
		}
		if (ev.key === 'ArrowDown') {
			ev.preventDefault();
			activeIndex = activeIndex < n - 1 ? activeIndex + 1 : 0;
			highlightActive();
			opts[activeIndex]?.scrollIntoView({ block: 'nearest' });
			return;
		}
		if (ev.key === 'ArrowUp') {
			ev.preventDefault();
			activeIndex = activeIndex > 0 ? activeIndex - 1 : n - 1;
			highlightActive();
			opts[activeIndex]?.scrollIntoView({ block: 'nearest' });
			return;
		}
		if (ev.key === 'Enter') {
			const idx = activeIndex >= 0 ? activeIndex : 0;
			const s = lastSuggestions[idx];
			if (s) {
				ev.preventDefault();
				void pickPlace(s.placeId);
			}
		}
	});

	document.addEventListener('click', (ev) => {
		if (!o.searchSection.contains(ev.target as Node)) {
			setSuggestionsOpen(false);
			o.suggestionsEl.innerHTML = '';
			lastSuggestions = [];
		}
	});

	/*
	 * Initial layout: always default to the address search picker; manual fields stay hidden
	 * until the user clicks "My address isn't listed". Saved Places picks show the summary in the search block.
	 */
	const src = o.initialSource?.trim() ?? '';
	const hasAddr = Boolean(o.initialCivic.trim() || o.initialStreet.trim());

	if (src === 'places' && o.initialPlaceId && hasAddr) {
		o.civicHidden.value = o.initialCivic;
		o.streetHidden.value = o.initialStreet;
		o.placeIdInput.value = o.initialPlaceId;
		o.formattedInput.value = o.initialFormatted ?? '';
		o.sourceInput.value = 'places';
		showPlacesSummary(o.initialCivic, o.initialStreet, o.initialFormatted ?? '');
	} else if (hasAddr) {
		o.civicHidden.value = o.initialCivic;
		o.streetHidden.value = o.initialStreet;
		o.placeIdInput.value = '';
		o.formattedInput.value = o.initialFormatted ?? '';
		o.sourceInput.value = 'manual';
		o.manualSection.hidden = true;
		o.searchSection.hidden = false;
		o.civicVisible.value = '';
		o.streetVisible.value = '';
		o.searchInput.value =
			(o.initialFormatted ?? '').trim() || `${o.initialCivic} ${o.initialStreet}`.trim();
		o.suggestionsEl.innerHTML = '';
		lastSuggestions = [];
		setSuggestionsOpen(false);
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
	} else {
		o.sourceInput.value = '';
		clearAndShowSearch();
	}
}
