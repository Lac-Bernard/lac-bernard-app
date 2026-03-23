import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../../consts';
import { blogPostSlug } from '../../utils/blog';

export async function GET(context) {
	const posts = await getCollection('blog');
	const englishPosts = posts.filter((post) => post.id.startsWith('en/'));
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: englishPosts.map((post) => ({
			...post.data,
			link: `/en/news/${blogPostSlug(post.id)}/`,
		})),
	});
}
