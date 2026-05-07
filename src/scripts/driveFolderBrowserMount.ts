const FOLDER_MIME = 'application/vnd.google-apps.folder';

type Locale = 'en' | 'fr';

const copy: Record<
	Locale,
	{
		back: string;
		searchLabel: string;
		searchPlaceholder: string;
		noMatches: string;
		loading: string;
		empty: string;
		error: string;
		folder: string;
		file: string;
		nameColumn: string;
		breadcrumbNav: string;
		breadcrumbJump: string;
	}
> = {
	en: {
		back: 'Back',
		searchLabel: 'Filter files in this folder',
		searchPlaceholder: 'Search…',
		noMatches: 'No names match your search.',
		loading: 'Loading…',
		empty: 'This folder is empty.',
		error: 'Could not load this folder.',
		folder: 'Folder',
		file: 'File',
		nameColumn: 'Name',
		breadcrumbNav: 'Folder path',
		breadcrumbJump: 'Open folder',
	},
	fr: {
		back: 'Retour',
		searchLabel: 'Filtrer les fichiers dans ce dossier',
		searchPlaceholder: 'Rechercher…',
		noMatches: 'Aucun nom ne correspond à votre recherche.',
		loading: 'Chargement…',
		empty: 'Ce dossier est vide.',
		error: 'Impossible de charger ce dossier.',
		folder: 'Dossier',
		file: 'Fichier',
		nameColumn: 'Nom',
		breadcrumbNav: 'Chemin du dossier',
		breadcrumbJump: 'Ouvrir le dossier',
	},
};

type ListItem = { id: string; name: string; mimeType: string; webViewLink: string | null };

type Crumb = { id: string; name: string };

function viewUrlForItem(item: ListItem): string {
	if (item.webViewLink) {
		return item.webViewLink;
	}
	if (item.mimeType === FOLDER_MIME) {
		return `https://drive.google.com/drive/folders/${item.id}`;
	}
	return `https://drive.google.com/file/d/${item.id}/view`;
}

function sortItems(items: ListItem[]): ListItem[] {
	return [...items].sort((a, b) => {
		const af = a.mimeType === FOLDER_MIME ? 0 : 1;
		const bf = b.mimeType === FOLDER_MIME ? 0 : 1;
		if (af !== bf) {
			return af - bf;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
	});
}

function createHighlightedNameNode(name: string, queryTrimmed: string): Node {
	const q = queryTrimmed.trim();
	if (!q) {
		return document.createTextNode(name);
	}
	const nameLower = name.toLowerCase();
	const qLower = q.toLowerCase();
	const idx = nameLower.indexOf(qLower);
	if (idx < 0) {
		return document.createTextNode(name);
	}

	const frag = document.createDocumentFragment();
	const before = name.slice(0, idx);
	const match = name.slice(idx, idx + q.length);
	const after = name.slice(idx + q.length);

	if (before) frag.append(document.createTextNode(before));
	const mark = document.createElement('mark');
	mark.className = 'drive-folder-browser__match';
	mark.textContent = match;
	frag.append(mark);
	if (after) frag.append(document.createTextNode(after));
	return frag;
}

/** Matches first, then non-matches; within each group: folders first, then name. */
function orderedItemsForQuery(items: ListItem[], queryTrimmed: string): {
	ordered: ListItem[];
	matchingIds: ReadonlySet<string>;
} {
	const q = queryTrimmed.toLowerCase();
	if (!q) {
		return { ordered: sortItems(items), matchingIds: new Set(items.map((i) => i.id)) };
	}
	const matches = items.filter((i) => i.name.toLowerCase().includes(q));
	const nonMatches = items.filter((i) => !i.name.toLowerCase().includes(q));
	return {
		ordered: [...sortItems(matches), ...sortItems(nonMatches)],
		matchingIds: new Set(matches.map((i) => i.id)),
	};
}

function itemsLabel(locale: Locale, count: number): string {
	if (locale === 'fr') {
		return count === 1 ? '1 élément' : `${count} éléments`;
	}
	return count === 1 ? '1 item' : `${count} items`;
}

export function mountDriveFolderBrowser(root: HTMLElement): void {
	const rootFolderId = root.dataset.rootFolderId?.trim();
	const locale = (root.dataset.locale === 'fr' ? 'fr' : 'en') as Locale;
	const t = copy[locale];

	if (!rootFolderId) {
		return;
	}

	root.innerHTML = `
		<header class="drive-folder-browser__toolbar">
			<button type="button" class="drive-folder-browser__back" disabled>${t.back}</button>
			<div class="drive-folder-browser__search-wrap">
				<label class="drive-folder-browser__search-label">
					<span class="drive-folder-browser__sr-only">${t.searchLabel}</span>
					<input
						class="drive-folder-browser__search"
						type="search"
						autocomplete="off"
						placeholder="${t.searchPlaceholder}"
						aria-label="${t.searchLabel}"
					/>
				</label>
			</div>
		</header>
		<nav class="drive-folder-browser__crumbs" aria-label="${t.breadcrumbNav}">
			<ol class="drive-folder-browser__crumb-list"></ol>
		</nav>
		<div class="drive-folder-browser__status" aria-live="polite"></div>
		<div class="drive-folder-browser__scroll-wrap">
			<div class="drive-folder-browser__scroll" tabindex="-1">
				<div class="drive-folder-browser__list-head">
					<span class="drive-folder-browser__list-head-label">${t.nameColumn}</span>
					<span class="drive-folder-browser__item-count" aria-live="polite"></span>
				</div>
				<ul class="drive-folder-browser__list" role="list"></ul>
			</div>
			<div class="drive-folder-browser__scroll-fade" aria-hidden="true"></div>
		</div>
	`;

	const backBtn = root.querySelector<HTMLButtonElement>('.drive-folder-browser__back');
	const searchInput = root.querySelector<HTMLInputElement>('.drive-folder-browser__search');
	const crumbListEl = root.querySelector<HTMLOListElement>('.drive-folder-browser__crumb-list');
	const statusEl = root.querySelector<HTMLElement>('.drive-folder-browser__status');
	const listEl = root.querySelector<HTMLUListElement>('.drive-folder-browser__list');
	const scrollWrap = root.querySelector<HTMLElement>('.drive-folder-browser__scroll-wrap');
	const scrollPanel = root.querySelector<HTMLElement>('.drive-folder-browser__scroll');
	const itemCountEl = root.querySelector<HTMLElement>('.drive-folder-browser__item-count');

	if (
		!backBtn ||
		!searchInput ||
		!crumbListEl ||
		!statusEl ||
		!listEl ||
		!scrollWrap ||
		!scrollPanel ||
		!itemCountEl
	) {
		return;
	}

	/** Latest loaded folder listing (cleared on navigation via loadFolder). */
	let currentItems: ListItem[] = [];

	const scrollHintThresholdPx = 6;

	function syncScrollHint(): void {
		const el = scrollPanel;
		const overflow = el.scrollHeight > el.clientHeight + scrollHintThresholdPx;
		const atBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - scrollHintThresholdPx;
		scrollWrap.classList.toggle('drive-folder-browser__scroll-wrap--more-below', overflow && !atBottom);
	}

	function scheduleScrollHint(): void {
		requestAnimationFrame(() => {
			requestAnimationFrame(syncScrollHint);
		});
	}

	scrollPanel.addEventListener('scroll', syncScrollHint, { passive: true });
	new ResizeObserver(syncScrollHint).observe(scrollPanel);

	/** Move focus off row buttons before they are removed so the page doesn’t scroll to top. */
	function anchorFocusInPanel(): void {
		scrollPanel.focus({ preventScroll: true });
	}

	function setItemCountLoading(): void {
		itemCountEl.className = 'drive-folder-browser__item-count';
		itemCountEl.innerHTML = `<span class="drive-folder-browser__spinner" aria-hidden="true"></span><span class="drive-folder-browser__sr-only">${t.loading}</span>`;
	}

	function clearItemCountLoading(): void {
		itemCountEl.className = 'drive-folder-browser__item-count';
	}

	const stack: Crumb[] = [{ id: rootFolderId, name: '…' }];

	function renderCrumbs(): void {
		crumbListEl.innerHTML = '';
		stack.forEach((crumb, index) => {
			const li = document.createElement('li');
			li.className = 'drive-folder-browser__crumb-item';
			const isLast = index === stack.length - 1;
			if (isLast) {
				const current = document.createElement('span');
				current.className = 'drive-folder-browser__crumb drive-folder-browser__crumb--current';
				current.setAttribute('aria-current', 'page');
				current.textContent = crumb.name;
				li.append(current);
			} else {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'drive-folder-browser__crumb';
				btn.textContent = crumb.name;
				btn.setAttribute('aria-label', `${t.breadcrumbJump}: ${crumb.name}`);
				const targetIndex = index;
				btn.addEventListener('click', () => {
					stack.length = targetIndex + 1;
					void loadFolder(stack[targetIndex].id);
				});
				li.append(btn);
			}
			crumbListEl.append(li);
		});
	}

	function renderItemList(): void {
		const queryTrimmed = searchInput.value.trim();
		const hasFilter = queryTrimmed.length > 0;
		const { ordered, matchingIds } = orderedItemsForQuery(currentItems, queryTrimmed);

		listEl.innerHTML = '';

		if (hasFilter && matchingIds.size === 0 && currentItems.length > 0) {
			statusEl.textContent = t.noMatches;
			statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--filter-empty';
		} else if (currentItems.length > 0) {
			statusEl.textContent = '';
			statusEl.className = 'drive-folder-browser__status';
		}

		for (const item of ordered) {
			const isFolder = item.mimeType === FOLDER_MIME;
			const filteredOut = hasFilter && !matchingIds.has(item.id);
			const li = document.createElement('li');
			li.className = [
				isFolder ? 'drive-folder-browser__row drive-folder-browser__row--folder' : 'drive-folder-browser__row drive-folder-browser__row--file',
				filteredOut ? 'drive-folder-browser__row--filtered-out' : '',
			]
				.filter(Boolean)
				.join(' ');

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'drive-folder-browser__row-btn';
			const icon = document.createElement('span');
			icon.className = isFolder
				? 'drive-folder-browser__glyph drive-folder-browser__glyph--folder'
				: 'drive-folder-browser__glyph drive-folder-browser__glyph--file';
			icon.setAttribute('aria-hidden', 'true');
			const label = document.createElement('span');
			label.className = 'drive-folder-browser__name';
			label.replaceChildren(createHighlightedNameNode(item.name, queryTrimmed));
			btn.append(icon, label);
			btn.setAttribute('aria-label', `${isFolder ? t.folder : t.file}: ${item.name}`);

			btn.addEventListener('click', () => {
				if (isFolder) {
					stack.push({ id: item.id, name: item.name });
					void loadFolder(item.id);
				} else {
					window.open(viewUrlForItem(item), '_blank', 'noopener,noreferrer');
				}
			});

			li.append(btn);
			listEl.append(li);
		}
		scheduleScrollHint();
	}

	async function loadFolder(folderId: string): Promise<void> {
		// New folder: clear filter so results always match “this folder”.
		searchInput.value = '';
		searchInput.disabled = true;
		currentItems = [];

		root.setAttribute('aria-busy', 'true');
		statusEl.textContent = '';
		statusEl.className = 'drive-folder-browser__status';
		setItemCountLoading();
		anchorFocusInPanel();
		listEl.innerHTML = '';
		scheduleScrollHint();
		backBtn.disabled = stack.length <= 1;
		renderCrumbs();

		try {
			const res = await fetch(`/api/drive/list?folderId=${encodeURIComponent(folderId)}`);
			const data = (await res.json()) as {
				items?: ListItem[];
				folderName?: string | null;
				error?: string;
			};

			if (!res.ok) {
				root.removeAttribute('aria-busy');
				searchInput.disabled = false;
				clearItemCountLoading();
				itemCountEl.textContent = '';
				currentItems = [];
				statusEl.textContent = t.error;
				statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--error';
				scrollWrap.classList.remove('drive-folder-browser__scroll-wrap--more-below');
				return;
			}

			currentItems = sortItems(data.items ?? []);
			const tail = stack[stack.length - 1];
			if (tail && tail.id === folderId && typeof data.folderName === 'string' && data.folderName.length > 0) {
				tail.name = data.folderName;
			}
			renderCrumbs();

			root.removeAttribute('aria-busy');
			searchInput.disabled = false;
			clearItemCountLoading();
			itemCountEl.textContent = itemsLabel(locale, currentItems.length);
			statusEl.textContent = '';
			statusEl.className = 'drive-folder-browser__status';

			if (currentItems.length === 0) {
				statusEl.textContent = t.empty;
				statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--empty';
				scheduleScrollHint();
				return;
			}

			renderItemList();
			anchorFocusInPanel();
		} catch {
			root.removeAttribute('aria-busy');
			searchInput.disabled = false;
			clearItemCountLoading();
			itemCountEl.textContent = '';
			currentItems = [];
			statusEl.textContent = t.error;
			statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--error';
			scrollWrap.classList.remove('drive-folder-browser__scroll-wrap--more-below');
		}
	}

	searchInput.addEventListener('input', () => {
		renderItemList();
	});
	searchInput.addEventListener('search', () => {
		renderItemList();
	});
	searchInput.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			searchInput.value = '';
			renderItemList();
		}
	});

	backBtn.addEventListener('click', () => {
		if (stack.length <= 1) {
			return;
		}
		stack.pop();
		const parent = stack[stack.length - 1];
		void loadFolder(parent.id);
	});

	void loadFolder(rootFolderId);
}
