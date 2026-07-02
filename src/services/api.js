// NOTE: We call our own Vercel proxy (/api/countries) instead of the external
// restcountries.com URL directly. This sidesteps CORS issues entirely because
// the request is same-origin from the browser's perspective; the Vercel function
// performs the outbound fetch server-side.
const COUNTRIES_API_URL = '/api/countries';

// Retry fetch with exponential backoff and a per-attempt timeout
const fetchWithRetry = async (url, { retries = 3, timeoutMs = 12000 } = {}) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === retries - 1;
      if (isLast) throw err;
      // Exponential backoff: 1s → 2s → 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
};

export const fetchCountries = async () => {
  const response = await fetchWithRetry(COUNTRIES_API_URL); // throws on total failure
  const data = await response.json();

  return data
    .filter(country => Array.isArray(country.latlng) && country.latlng.length >= 2)
    .map(country => ({
      id: country.cca3,
      name: country.name.common,
      capital: country.capital?.[0] || 'Unknown',
      population: country.population,
      region: country.region,
      subregion: country.subregion || 'Unknown',
      languages: country.languages || null,
      currencies: country.currencies || null,
      flag: country.flags.svg,
      lat: country.latlng[0],
      lng: country.latlng[1]
    }));
};
