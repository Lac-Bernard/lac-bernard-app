export const prerender = false;
import type { APIRoute } from 'astro';
import { DRIVE_BROWSER_ALLOWED_ROOT_FOLDER_IDS } from '../../../lib/googleDrive/allowedFolderRoots';
import { createDriveReadonlyClient } from '../../../lib/googleDrive/driveClient';
import { isFolderUnderAllowedRoots } from '../../../lib/googleDrive/folderAccess';
import { getGoogleServiceAccountJsonOptional } from '../../../lib/supabase/env';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
		},
	});
}

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const folderId = url.searchParams.get('folderId')?.trim() ?? '';
	if (!folderId || !/^[a-zA-Z0-9_-]+$/.test(folderId)) {
		return json({ error: 'invalid_folder_id' }, 400);
	}

	const serviceAccountJson = getGoogleServiceAccountJsonOptional();
	if (!serviceAccountJson) {
		return json({ error: 'drive_unconfigured' }, 503);
	}

	try {
		const drive = createDriveReadonlyClient(serviceAccountJson);
		const permitted = await isFolderUnderAllowedRoots(
			drive,
			folderId,
			DRIVE_BROWSER_ALLOWED_ROOT_FOLDER_IDS,
		);
		if (!permitted) {
			return json({ error: 'forbidden' }, 403);
		}

		const { mimeType, name: folderName } = (
			await drive.files.get({
				fileId: folderId,
				fields: 'mimeType, name',
				supportsAllDrives: true,
			})
		).data;
		if (mimeType !== FOLDER_MIME) {
			return json({ error: 'not_a_folder' }, 400);
		}

		const items: Array<{ id: string; name: string; mimeType: string; webViewLink: string | null }> =
			[];
		let pageToken: string | undefined;

		do {
			const res = await drive.files.list({
				q: `'${folderId}' in parents and trashed = false`,
				fields: 'nextPageToken, files(id, name, mimeType, webViewLink)',
				orderBy: 'folder,name_natural',
				pageSize: 100,
				pageToken,
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			});
			for (const f of res.data.files ?? []) {
				if (f.id && f.name && f.mimeType) {
					items.push({
						id: f.id,
						name: f.name,
						mimeType: f.mimeType,
						webViewLink: f.webViewLink ?? null,
					});
				}
			}
			pageToken = res.data.nextPageToken ?? undefined;
		} while (pageToken);

		return json({ items, folderName: folderName ?? null });
	} catch (e) {
		console.error('Drive list failed:', e);
		return json({ error: 'drive_list_failed' }, 500);
	}
};
