// Vercel Serverless Function — proxies the REST Countries API server-side.
// Browser calls /api/countries (same origin → no CORS issues).
// Vercel's server fetches from restcountries.com and caches the result for 24h.

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const url =
    'https://restcountries.com/v3.1/all' +
    '?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3';

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      throw new Error(`Upstream returned HTTP ${upstream.status}`);
    }
    const data = await upstream.json();

    // Cache at Vercel's CDN edge for 24 hours; serve stale while revalidating
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[/api/countries] fetch failed:', err.message);
    return res.status(502).json({ error: 'Failed to fetch country data: ' + err.message });
  }
}
