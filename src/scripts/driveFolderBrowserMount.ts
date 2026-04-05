const FOLDER_MIME = 'application/vnd.google-apps.folder';

type Locale = 'en' | 'fr';

const copy: Record<
	Locale,
	{
		back: string;
		openDrive: string;
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
		openDrive: 'Open in Google Drive',
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
		openDrive: 'Ouvrir dans Google Drive',
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

	const driveFolderUrl = `https://drive.google.com/drive/folders/${rootFolderId}`;

	root.innerHTML = `
		<header class="drive-folder-browser__toolbar">
			<button type="button" class="drive-folder-browser__back" disabled>${t.back}</button>
			<a class="drive-folder-browser__open-drive" href="${driveFolderUrl}" target="_blank" rel="noopener noreferrer">${t.openDrive}</a>
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
	const openDriveEl = root.querySelector<HTMLAnchorElement>('.drive-folder-browser__open-drive');
	const crumbListEl = root.querySelector<HTMLOListElement>('.drive-folder-browser__crumb-list');
	const statusEl = root.querySelector<HTMLElement>('.drive-folder-browser__status');
	const listEl = root.querySelector<HTMLUListElement>('.drive-folder-browser__list');
	const scrollWrap = root.querySelector<HTMLElement>('.drive-folder-browser__scroll-wrap');
	const scrollPanel = root.querySelector<HTMLElement>('.drive-folder-browser__scroll');
	const itemCountEl = root.querySelector<HTMLElement>('.drive-folder-browser__item-count');

	if (
		!backBtn ||
		!openDriveEl ||
		!crumbListEl ||
		!statusEl ||
		!listEl ||
		!scrollWrap ||
		!scrollPanel ||
		!itemCountEl
	) {
		return;
	}

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

	function syncOpenDriveHref(): void {
		const tail = stack[stack.length - 1];
		if (tail) {
			openDriveEl.href = `https://drive.google.com/drive/folders/${tail.id}`;
		}
	}

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
		syncOpenDriveHref();
	}

	async function loadFolder(folderId: string): Promise<void> {
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
				clearItemCountLoading();
				itemCountEl.textContent = '';
				statusEl.textContent = t.error;
				statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--error';
				scrollWrap.classList.remove('drive-folder-browser__scroll-wrap--more-below');
				return;
			}

			const items = sortItems(data.items ?? []);
			const tail = stack[stack.length - 1];
			if (tail && tail.id === folderId && typeof data.folderName === 'string' && data.folderName.length > 0) {
				tail.name = data.folderName;
			}
			renderCrumbs();

			root.removeAttribute('aria-busy');
			clearItemCountLoading();
			itemCountEl.textContent = itemsLabel(locale, items.length);
			statusEl.textContent = '';
			statusEl.className = 'drive-folder-browser__status';

			if (items.length === 0) {
				statusEl.textContent = t.empty;
				statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--empty';
				scheduleScrollHint();
				return;
			}

			for (const item of items) {
				const li = document.createElement('li');
				const isFolder = item.mimeType === FOLDER_MIME;
				li.className = isFolder
					? 'drive-folder-browser__row drive-folder-browser__row--folder'
					: 'drive-folder-browser__row drive-folder-browser__row--file';
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
				label.textContent = item.name;
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
			anchorFocusInPanel();
			scheduleScrollHint();
		} catch {
			root.removeAttribute('aria-busy');
			clearItemCountLoading();
			itemCountEl.textContent = '';
			statusEl.textContent = t.error;
			statusEl.className = 'drive-folder-browser__status drive-folder-browser__status--error';
			scrollWrap.classList.remove('drive-folder-browser__scroll-wrap--more-below');
		}
	}

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
