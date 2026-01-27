import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../../consts';

export async function GET(context) {
	const posts = await getCollection('blog');
	// Only include English posts (those NOT ending with -fr)
	const englishPosts = posts.filter(post => !post.id.endsWith('-fr'));
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: englishPosts.map((post) => ({
			...post.data,
			link: `/en/news/${post.id}/`,
		})),
	});
}
