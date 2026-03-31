import { google } from 'googleapis';
import { formatMemberJoinedNames } from '../members/memberDisplayName';
import { getGoogleSheetsEnv } from '../supabase/env';
import { createSupabaseServiceRoleClient } from '../supabase/service';

const PAGE_SIZE = 1000;
const MEMBERS_SHEET_NAME = 'Members';
const MEMBERSHIPS_SHEET_NAME = 'Memberships';
const PAYMENTS_SHEET_NAME = 'Payments';

type MemberRow = {
	id: string;
	created_at: string;
	first_name: string | null;
	last_name: string;
	primary_email: string | null;
	secondary_email: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_phone: string | null;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	primary_address: string | null;
	primary_city: string | null;
	primary_province: string | null;
	primary_country: string | null;
	primary_postal_code: string | null;
	email_opt_in: boolean;
	notes: string | null;
	status: string;
	user_id: string | null;
	stripe_customer_id: string | null;
	other_first_name: string | null;
	other_last_name: string | null;
};

type MembershipRow = {
	id: string;
	created_at: string;
	member_id: string;
	year: number;
	tier: string;
	status: string;
	activated_at: string | null;
};

type PaymentRow = {
	id: number;
	created_at: string;
	membership_id: string;
	method: string | null;
	amount: number | string | null;
	date: string | null;
	notes: string | null;
	payment_id: string | null;
	membership_amount: number | string;
	donation_amount: number | string;
	donation_note: string | null;
};

const MEMBER_COLUMNS: (keyof MemberRow)[] = [
	'id',
	'created_at',
	'first_name',
	'last_name',
	'primary_email',
	'secondary_email',
	'primary_phone',
	'secondary_phone',
	'lake_phone',
	'lake_civic_number',
	'lake_street_name',
	'primary_address',
	'primary_city',
	'primary_province',
	'primary_country',
	'primary_postal_code',
	'email_opt_in',
	'notes',
	'status',
	'user_id',
	'stripe_customer_id',
	'other_first_name',
	'other_last_name',
];

const MEMBERSHIP_COLUMNS: (keyof MembershipRow)[] = [
	'id',
	'created_at',
	'member_id',
	'year',
	'tier',
	'status',
	'activated_at',
];

const PAYMENT_COLUMNS: (keyof PaymentRow)[] = [
	'id',
	'created_at',
	'membership_id',
	'method',
	'amount',
	'date',
	'notes',
	'payment_id',
	'membership_amount',
	'donation_amount',
	'donation_note',
];

type SyncResult = {
	members: number;
	memberships: number;
	payments: number;
};

function normalizeSheetValue(value: unknown): string | number | boolean {
	if (value == null) return '';
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	return JSON.stringify(value);
}

function memberName(member: Pick<MemberRow, 'first_name' | 'last_name' | 'other_first_name' | 'other_last_name'> | null): string {
	if (!member) return '';
	return formatMemberJoinedNames(member);
}

async function createSheetsClient() {
	const { serviceAccountJson } = getGoogleSheetsEnv();
	const credentials = parseServiceAccountJson(serviceAccountJson);
	if (!credentials.client_email || !credentials.private_key) {
		throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.');
	}
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	});
	return google.sheets({ version: 'v4', auth });
}

function parseServiceAccountJson(rawValue: string): {
	client_email?: string;
	private_key?: string;
} {
	const normalized = rawValue.trim();
	const unwrapped =
		(normalized.startsWith("'") && normalized.endsWith("'")) ||
		(normalized.startsWith('"') && normalized.endsWith('"'))
			? normalized.slice(1, -1)
			: normalized;

	const parseJson = (value: string) =>
		JSON.parse(value) as {
			client_email?: string;
			private_key?: string;
		};

	try {
		return parseJson(unwrapped);
	} catch {
		const decoded = Buffer.from(unwrapped, 'base64').toString('utf8');
		return parseJson(decoded);
	}
}

async function fetchMembers(): Promise<MemberRow[]> {
	const service = createSupabaseServiceRoleClient();
	const rows: MemberRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const to = from + PAGE_SIZE - 1;
		const { data, error } = await service
			.from('members')
			.select(MEMBER_COLUMNS.join(','))
			.order('created_at', { ascending: true })
			.order('id', { ascending: true })
			.range(from, to);
		if (error) throw new Error(`Members query failed: ${error.message}`);
		const page = ((data ?? []) as unknown) as MemberRow[];
		rows.push(...page);
		if (page.length < PAGE_SIZE) break;
	}
	return rows;
}

async function fetchMemberships(): Promise<MembershipRow[]> {
	const service = createSupabaseServiceRoleClient();
	const rows: MembershipRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const to = from + PAGE_SIZE - 1;
		const { data, error } = await service
			.from('memberships')
			.select(MEMBERSHIP_COLUMNS.join(','))
			.order('created_at', { ascending: true })
			.order('id', { ascending: true })
			.range(from, to);
		if (error) throw new Error(`Memberships query failed: ${error.message}`);
		const page = ((data ?? []) as unknown) as MembershipRow[];
		rows.push(...page);
		if (page.length < PAGE_SIZE) break;
	}
	return rows;
}

async function fetchPayments(): Promise<PaymentRow[]> {
	const service = createSupabaseServiceRoleClient();
	const rows: PaymentRow[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const to = from + PAGE_SIZE - 1;
		const { data, error } = await service
			.from('payments')
			.select(PAYMENT_COLUMNS.join(','))
			.order('created_at', { ascending: true })
			.order('id', { ascending: true })
			.range(from, to);
		if (error) throw new Error(`Payments query failed: ${error.message}`);
		const page = ((data ?? []) as unknown) as PaymentRow[];
		rows.push(...page);
		if (page.length < PAGE_SIZE) break;
	}
	return rows;
}

function buildMembersValues(rows: MemberRow[]): (string | number | boolean)[][] {
	return [
		MEMBER_COLUMNS.slice(),
		...rows.map((row) => MEMBER_COLUMNS.map((column) => normalizeSheetValue(row[column]))),
	];
}

function buildMembershipsValues(
	rows: MembershipRow[],
	memberMap: Map<string, MemberRow>,
): (string | number | boolean)[][] {
	return [
		[...MEMBERSHIP_COLUMNS, 'member_name', 'member_primary_email'],
		...rows.map((row) => {
			const member = memberMap.get(row.member_id) ?? null;
			return [
				...MEMBERSHIP_COLUMNS.map((column) => normalizeSheetValue(row[column])),
				memberName(member),
				normalizeSheetValue(member?.primary_email ?? ''),
			];
		}),
	];
}

function buildPaymentsValues(
	rows: PaymentRow[],
	membershipMap: Map<string, MembershipRow>,
	memberMap: Map<string, MemberRow>,
): (string | number | boolean)[][] {
	return [
		[...PAYMENT_COLUMNS, 'member_name', 'member_primary_email'],
		...rows.map((row) => {
			const membership = membershipMap.get(row.membership_id) ?? null;
			const member = membership ? memberMap.get(membership.member_id) ?? null : null;
			return [
				...PAYMENT_COLUMNS.map((column) => normalizeSheetValue(row[column])),
				memberName(member),
				normalizeSheetValue(member?.primary_email ?? ''),
			];
		}),
	];
}

async function replaceSheetValues(
	sheets: Awaited<ReturnType<typeof createSheetsClient>>,
	sheetId: string,
	sheetName: string,
	values: (string | number | boolean)[][],
) {
	await sheets.spreadsheets.values.clear({
		spreadsheetId: sheetId,
		range: `${sheetName}!A:ZZ`,
	});
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${sheetName}!A1`,
		valueInputOption: 'RAW',
		requestBody: { values },
	});
}

type SheetInfo = {
	sheetId: number;
	title: string;
};

async function getSheetInfoMap(
	sheets: Awaited<ReturnType<typeof createSheetsClient>>,
	sheetId: string,
): Promise<Map<string, SheetInfo>> {
	const { data } = await sheets.spreadsheets.get({
		spreadsheetId: sheetId,
		fields: 'sheets.properties.sheetId,sheets.properties.title',
	});
	return new Map(
		(data.sheets ?? [])
			.map((sheet) => sheet.properties)
			.filter(
				(properties): properties is { sheetId: number; title: string } =>
					typeof properties?.sheetId === 'number' && typeof properties?.title === 'string',
			)
			.map((properties) => [
				properties.title,
				{ sheetId: properties.sheetId, title: properties.title },
			]),
	);
}

async function ensureSheetsExist(
	sheets: Awaited<ReturnType<typeof createSheetsClient>>,
	sheetId: string,
	sheetNames: string[],
): Promise<Map<string, SheetInfo>> {
	const existingSheets = await getSheetInfoMap(sheets, sheetId);
	const existingNames = new Set(existingSheets.keys());
	const missingNames = sheetNames.filter((name) => !existingNames.has(name));
	if (missingNames.length === 0) return existingSheets;
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId: sheetId,
		requestBody: {
			requests: missingNames.map((title) => ({
				addSheet: {
					properties: { title },
				},
			})),
		},
	});
	return getSheetInfoMap(sheets, sheetId);
}

async function applySheetPresentation(
	sheets: Awaited<ReturnType<typeof createSheetsClient>>,
	spreadsheetId: string,
	sheet: SheetInfo,
	rowCount: number,
	columnCount: number,
) {
	await sheets.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: {
			requests: [
				{
					updateSheetProperties: {
						properties: {
							sheetId: sheet.sheetId,
							gridProperties: {
								frozenRowCount: 1,
							},
						},
						fields: 'gridProperties.frozenRowCount',
					},
				},
				{
					repeatCell: {
						range: {
							sheetId: sheet.sheetId,
							startRowIndex: 0,
							endRowIndex: 1,
						},
						cell: {
							userEnteredFormat: {
								textFormat: {
									bold: true,
								},
							},
						},
						fields: 'userEnteredFormat.textFormat.bold',
					},
				},
				{
					setBasicFilter: {
						filter: {
							range: {
								sheetId: sheet.sheetId,
								startRowIndex: 0,
								endRowIndex: rowCount,
								startColumnIndex: 0,
								endColumnIndex: columnCount,
							},
						},
					},
				},
				{
					autoResizeDimensions: {
						dimensions: {
							sheetId: sheet.sheetId,
							dimension: 'COLUMNS',
							startIndex: 0,
							endIndex: columnCount,
						},
					},
				},
			],
		},
	});
}

export async function syncSupabaseToGoogleSheets(): Promise<SyncResult> {
	const { sheetId } = getGoogleSheetsEnv();
	const [members, memberships, payments, sheets] = await Promise.all([
		fetchMembers(),
		fetchMemberships(),
		fetchPayments(),
		createSheetsClient(),
	]);

	const memberMap = new Map(members.map((row) => [row.id, row]));
	const membershipMap = new Map(memberships.map((row) => [row.id, row]));

	const sheetInfoMap = await ensureSheetsExist(sheets, sheetId, [
		MEMBERS_SHEET_NAME,
		MEMBERSHIPS_SHEET_NAME,
		PAYMENTS_SHEET_NAME,
	]);

	const memberValues = buildMembersValues(members);
	const membershipValues = buildMembershipsValues(memberships, memberMap);
	const paymentValues = buildPaymentsValues(payments, membershipMap, memberMap);

	await replaceSheetValues(sheets, sheetId, MEMBERS_SHEET_NAME, memberValues);
	await replaceSheetValues(
		sheets,
		sheetId,
		MEMBERSHIPS_SHEET_NAME,
		membershipValues,
	);
	await replaceSheetValues(
		sheets,
		sheetId,
		PAYMENTS_SHEET_NAME,
		paymentValues,
	);
	await applySheetPresentation(
		sheets,
		sheetId,
		sheetInfoMap.get(MEMBERS_SHEET_NAME)!,
		memberValues.length,
		memberValues[0]?.length ?? 0,
	);
	await applySheetPresentation(
		sheets,
		sheetId,
		sheetInfoMap.get(MEMBERSHIPS_SHEET_NAME)!,
		membershipValues.length,
		membershipValues[0]?.length ?? 0,
	);
	await applySheetPresentation(
		sheets,
		sheetId,
		sheetInfoMap.get(PAYMENTS_SHEET_NAME)!,
		paymentValues.length,
		paymentValues[0]?.length ?? 0,
	);

	return {
		members: members.length,
		memberships: memberships.length,
		payments: payments.length,
	};
}
