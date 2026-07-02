// Vercel Serverless Function — proxies country data server-side.
// Tries restcountries.com first, falls back to jsDelivr CDN.

const UPSTREAM_SOURCES = [
  'https://restcountries.com/v3.1/all?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3',
  'https://cdn.jsdelivr.net/npm/world-countries@5.0.0/countries.json',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let lastError = null;

  for (const url of UPSTREAM_SOURCES) {
    try {
      const upstream = await fetch(url);
      if (!upstream.ok) {
        lastError = `HTTP ${upstream.status} from ${url}`;
        continue;
      }

      const data = await upstream.json();
      if (!Array.isArray(data)) {
        lastError = `Non-array response from ${url}`;
        continue;
      }

      // Cache at Vercel CDN edge for 24h, serve stale for 1h during revalidation
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json(data);
    } catch (err) {
      lastError = err.message;
      console.error(`[/api/countries] Source failed (${url}):`, err.message);
    }
  }

  return res.status(502).json({
    error: `All upstream sources failed. Last error: ${lastError}`
  });
}
