// In development, call restcountries.com directly, falling back to a github mirror.
// In production, call our own serverless proxy /api/countries, falling back to the github mirror.
const SOURCES = import.meta.env.DEV
  ? [
      'https://restcountries.com/v3.1/all?fields=name,capital,population,flags,region,subregion,languages,currencies,latlng,cca3',
      'https://raw.githubusercontent.com/jbrekalo/rest-countries-api/master/data.json'
    ]
  : [
      '/api/countries',
      'https://raw.githubusercontent.com/jbrekalo/rest-countries-api/master/data.json'
    ];

const mapCountry = (country) => {
  if (!Array.isArray(country.latlng) || country.latlng.length < 2) return null;

  // Normalize Name
  const name = country.name?.common || country.name;
  if (!name) return null;

  // Normalize Capital
  const capital = Array.isArray(country.capital) 
    ? country.capital[0] 
    : (country.capital || 'Unknown');

  // Normalize Flag
  const flag = country.flags?.svg || country.flags?.png || country.flag || '';

  // Normalize Languages (mledoze version is array of objects, restcountries is key-value object)
  let languages = null;
  if (country.languages) {
    if (Array.isArray(country.languages)) {
      languages = {};
      country.languages.forEach((l, idx) => {
        languages[idx] = l.name;
      });
    } else {
      languages = country.languages;
    }
  }

  // Normalize Currencies (mledoze version is array of objects, restcountries is key-value object)
  let currencies = null;
  if (country.currencies) {
    if (Array.isArray(country.currencies)) {
      currencies = {};
      country.currencies.forEach((c) => {
        const code = c.code || Object.keys(c)[0];
        if (code) {
          currencies[code] = { name: c.name, symbol: c.symbol };
        }
      });
    } else {
      currencies = country.currencies;
    }
  }

  return {
    id: country.cca3 || country.alpha3Code,
    name,
    capital,
    population: country.population || 0,
    region: country.region || 'Unknown',
    subregion: country.subregion || 'Unknown',
    languages,
    currencies,
    flag,
    lat: country.latlng[0],
    lng: country.latlng[1]
  };
};

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
  let lastError = null;

  for (const url of SOURCES) {
    try {
      const response = await fetchWithRetry(url);
      const data = await response.json();

      // Skip invalid formats
      const dataArray = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : null);
      if (!dataArray) {
        lastError = new Error(`Invalid format from ${url}`);
        continue;
      }

      const mapped = dataArray.map(mapCountry).filter(Boolean);
      if (mapped.length === 0) {
        lastError = new Error(`Empty country list from ${url}`);
        continue;
      }

      console.log(`[api] Loaded ${mapped.length} countries from: ${url}`);
      return mapped;
    } catch (error) {
      lastError = error;
      console.warn(`[api] Source failed (${url}):`, error.message);
    }
  }

  throw lastError || new Error('All country data sources exhausted');
};
