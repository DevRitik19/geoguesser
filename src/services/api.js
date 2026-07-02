// In development (Vite local server), call restcountries.com directly.
// In production (Vercel), call our own serverless proxy at /api/countries
// which fetches server-side — no CORS issues.
const COUNTRIES_API_URL = import.meta.env.DEV
  ? 'https://restcountries.com/v3.1/all?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3'
  : '/api/countries';

// Simple retry with exponential backoff
const fetchWithRetry = async (url, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
};

export const fetchCountries = async () => {
  const response = await fetchWithRetry(COUNTRIES_API_URL);
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
