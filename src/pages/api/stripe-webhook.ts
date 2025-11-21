import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  // We’ll fill this later with Stripe signature verification.
  const bodyText = await request.text();

  console.log('Stripe webhook payload:', bodyText);

  // Always respond 200 quickly so Stripe stops retrying while we build.
  return new Response('ok', { status: 200 });
};