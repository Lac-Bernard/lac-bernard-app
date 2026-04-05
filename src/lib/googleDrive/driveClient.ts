import { google } from 'googleapis';

export function createDriveReadonlyClient(serviceAccountJson: string) {
	const creds = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
	const auth = new google.auth.JWT({
		email: creds.client_email,
		key: creds.private_key,
		scopes: ['https://www.googleapis.com/auth/drive.readonly'],
	});
	return google.drive({ version: 'v3', auth });
}
