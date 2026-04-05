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
	let openDebounce: (() => void) | undefined;
	let acAbort: AbortController | undefined;

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
		o.suggestionsEl.hidden = true;
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
		syncManualToHidden();
		o.civicVisible.focus();
	};

	const showSearch = () => {
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
		o.suggestionsEl.hidden = true;
		if (o.summaryEl) {
			o.summaryEl.textContent = '';
			o.summaryEl.hidden = true;
		}
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
		if (o.summaryEl) {
			o.summaryEl.textContent = formatted || `${civic} ${street}`.trim();
			o.summaryEl.hidden = false;
		}
		o.manualSection.hidden = true;
		o.searchSection.hidden = false;
		o.searchInput.value = formatted || `${civic} ${street}`.trim();
		o.suggestionsEl.hidden = true;
	};

	const runAutocomplete = async (q: string) => {
		if (!placesAvailable || q.trim().length < 2) {
			o.suggestionsEl.innerHTML = '';
			o.suggestionsEl.hidden = true;
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
				o.suggestionsEl.hidden = true;
				return;
			}
			const data = (await res.json()) as { suggestions?: { placeId: string; text: string }[] };
			const sugs = data.suggestions ?? [];
			o.suggestionsEl.innerHTML = '';
			if (sugs.length === 0) {
				const li = document.createElement('li');
				li.className = 'lakeAddressSuggestHint';
				li.textContent = o.strings.noSuggestions;
				o.suggestionsEl.appendChild(li);
				o.suggestionsEl.hidden = false;
				return;
			}
			for (const s of sugs) {
				const li = document.createElement('li');
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'lakeAddressSuggestBtn';
				btn.textContent = s.text;
				btn.addEventListener('click', () => void pickPlace(s.placeId));
				li.appendChild(btn);
				o.suggestionsEl.appendChild(li);
			}
			o.suggestionsEl.hidden = false;
		} catch {
			if ((acAbort as AbortController).signal.aborted) return;
			o.suggestionsEl.innerHTML = '';
			o.suggestionsEl.hidden = true;
		}
	};

	const pickPlace = async (placeId: string) => {
		o.suggestionsEl.innerHTML = '';
		o.suggestionsEl.hidden = true;
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
	openDebounce = () => undefined;

	o.manualToggle.addEventListener('click', () => {
		showManual();
	});

	o.backToggle?.addEventListener('click', () => {
		showSearch();
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

	document.addEventListener('click', (ev) => {
		if (!o.searchSection.contains(ev.target as Node)) {
			o.suggestionsEl.hidden = true;
		}
	});

	/* Initial layout */
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
		o.sourceInput.value = 'manual';
		o.formattedInput.value = o.initialFormatted ?? '';
		showManual();
	} else {
		o.sourceInput.value = '';
		showSearch();
	}
}
