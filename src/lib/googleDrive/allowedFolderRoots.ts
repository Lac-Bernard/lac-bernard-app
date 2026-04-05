/**
 * Root folder IDs linked from the public site. The Drive list API only serves
 * folders that sit under one of these trees (prevents arbitrary Drive probing).
 * Add an id here when a new embedded browser page is introduced.
 */
export const DRIVE_BROWSER_ALLOWED_ROOT_FOLDER_IDS: ReadonlySet<string> = new Set([
	'10xTw41zINMi-csg6-GE1NuTYVhFCU4GK', // history-first-nations
	'15WIENErk_jkIySJZqj03iD0seiTWZhr8', // history-aerial-photos
	'16B4B3NZNexzG19UoOyj5U04sGC7cPGle', // history-fishing-club
	'1C8fEITRmoRj7GvovkUqguFSxcNYGFpw-', // history-related
	'1dBOjaQn37pO5-445XgENTO4VHI620ozB', // about-business-records
	'1dVjk4UBQvUVXI70q1k5DCUK4YTSYdFuq', // history-maps
	'1FymO4jIrA_Xa4a2mwRo-UnTsWZQOOOCf', // about-archive
	'1H_LvoSzirCfczkBn_WiGJUAl6K43Yfyq', // history-newspaper-clippings
	'1MOfJlKun72Muq-G29fwzYfIa99G7AVmt', // history-research-sources
	'1pLhabTA7ZbPmijuT2lexmZd8AmXvjcyY', // environment reports
	'1PCGcVBZKJeH85ZxhxCfN6e10ahMyLLkQ', // history-stories-lake
	'1Qyt1NhiFtAsG6GDGsnNpAJVCd2j9xhKO', // history-stories-families-individuals
	'1Uxk4FL0LuOR9i4V28geUo4gDAq7p_xrB', // history-properties-deeds
]);
