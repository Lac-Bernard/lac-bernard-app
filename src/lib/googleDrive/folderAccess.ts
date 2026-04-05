import type { drive_v3 } from 'googleapis';

const MAX_DEPTH = 64;

/**
 * True if `folderId` is one of the allowed roots or a descendant of one (via parent chain).
 */
export async function isFolderUnderAllowedRoots(
	drive: drive_v3.Drive,
	folderId: string,
	allowedRoots: ReadonlySet<string>,
): Promise<boolean> {
	let current = folderId;
	for (let depth = 0; depth < MAX_DEPTH; depth++) {
		if (allowedRoots.has(current)) {
			return true;
		}
		const { data } = await drive.files.get({
			fileId: current,
			fields: 'parents',
			supportsAllDrives: true,
		});
		const parents = data.parents ?? [];
		if (parents.length === 0) {
			return false;
		}
		current = parents[0];
	}
	return false;
}
