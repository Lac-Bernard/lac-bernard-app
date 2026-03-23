import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { blogPostSlug } from '../../utils/blog';

export async function GET(context) {
	const posts = await getCollection('blog');
	const frenchPosts = posts.filter((post) => post.id.startsWith('fr/'));
	return rss({
		title: 'Association du lac Bernard',
		description: 'Association des propriétaires et résidents du Lac Bernard',
		site: context.site,
		items: frenchPosts.map((post) => ({
			...post.data,
			link: `/fr/news/${blogPostSlug(post.id)}/`,
		})),
	});
}
