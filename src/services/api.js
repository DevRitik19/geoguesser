// Country data sources, tried in order.
// - In production: our own Vercel proxy (/api/countries) first
// - jsDelivr CDN serves the same `world-countries` package that powers
//   restcountries.com — very high uptime, global CDN
// - restcountries.com directly as last resort
const SOURCES = import.meta.env.DEV
  ? [
      'https://restcountries.com/v3.1/all?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3',
      'https://cdn.jsdelivr.net/npm/world-countries@5.0.0/countries.json',
    ]
  : [
      '/api/countries',
      'https://cdn.jsdelivr.net/npm/world-countries@5.0.0/countries.json',
      'https://restcountries.com/v3.1/all?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3',
    ];

// Map raw country object to our app's schema.
// Handles both restcountries.com and world-countries package formats.
const mapCountry = (country) => {
  // latlng must be a valid array with two elements
  if (!Array.isArray(country.latlng) || country.latlng.length < 2) return null;

  // Flag: prefer .svg, fall back to flagcdn.com using cca2
  const flag =
    country.flags?.svg ||
    country.flags?.png ||
    (country.cca2 ? `https://flagcdn.com/${country.cca2.toLowerCase()}.svg` : '');

  return {
    id: country.cca3,
    name: country.name?.common || country.name,
    capital: Array.isArray(country.capital) ? country.capital[0] : (country.capital || 'Unknown'),
    population: country.population || 0,
    region: country.region || 'Unknown',
    subregion: country.subregion || 'Unknown',
    languages: country.languages || null,
    currencies: country.currencies || null,
    flag,
    lat: country.latlng[0],
    lng: country.latlng[1],
  };
};

export const fetchCountries = async () => {
  let lastError = null;

  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }

      const data = await res.json();

      // Skip responses that are error objects instead of arrays
      if (!Array.isArray(data)) {
        lastError = new Error(`Non-array response from ${url}: ${JSON.stringify(data).slice(0, 100)}`);
        continue;
      }

      const mapped = data.map(mapCountry).filter(Boolean);
      if (mapped.length === 0) {
        lastError = new Error(`Empty country list from ${url}`);
        continue;
      }

      console.log(`[api] Loaded ${mapped.length} countries from: ${url}`);
      return mapped;
    } catch (err) {
      lastError = err;
      console.warn(`[api] Source failed (${url}):`, err.message);
    }
  }

  throw lastError || new Error('All country data sources exhausted');
};
