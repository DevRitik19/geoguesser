// Vercel Serverless Function — proxies REST Countries API server-side.
// Browser calls /api/countries (same origin → no CORS).
// Vercel CDN caches the response for 24h.

const UPSTREAM_URL =
  'https://restcountries.com/v3.1/all' +
  '?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const upstream = await fetch(UPSTREAM_URL);

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: `Upstream error: HTTP ${upstream.status}` });
    }

    const data = await upstream.json();

    // Cache at Vercel edge CDN for 24h
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[/api/countries]', err.message);
    return res.status(502).json({
      error: 'Failed to fetch country data from upstream: ' + err.message
    });
  }
}
