/**
 * Google Maps & OpenStreetMap Geocoding & Distance Utilities for Insta Token
 */

// Popular City & Locality Coordinate Fallback Cache for instant lookup
export const KNOWN_CITIES: Record<string, { lat: number; lng: number; name: string }> = {
  // Bengaluru
  'koramangala': { lat: 12.9352, lng: 77.6244, name: 'Koramangala, Bengaluru' },
  'hsr': { lat: 12.9081, lng: 77.6476, name: 'HSR Layout, Bengaluru' },
  'hsr layout': { lat: 12.9081, lng: 77.6476, name: 'HSR Layout, Bengaluru' },
  'indiranagar': { lat: 12.9784, lng: 77.6408, name: 'Indiranagar, Bengaluru' },
  'jayanagar': { lat: 12.9258, lng: 77.5933, name: 'Jayanagar, Bengaluru' },
  'whitefield': { lat: 12.9698, lng: 77.7499, name: 'Whitefield, Bengaluru' },
  'marathahalli': { lat: 12.9591, lng: 77.6974, name: 'Marathahalli, Bengaluru' },
  'electronic city': { lat: 12.8452, lng: 77.6602, name: 'Electronic City, Bengaluru' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  
  // Hyderabad & Telangana
  'gachibowli': { lat: 17.4401, lng: 78.3489, name: 'Gachibowli, Hyderabad' },
  'madhapur': { lat: 17.4483, lng: 78.3915, name: 'Madhapur, Hyderabad' },
  'hitec city': { lat: 17.4474, lng: 78.3762, name: 'HITEC City, Hyderabad' },
  'jubilee hills': { lat: 17.4319, lng: 78.4073, name: 'Jubilee Hills, Hyderabad' },
  'banjara hills': { lat: 17.4156, lng: 78.4350, name: 'Banjara Hills, Hyderabad' },
  'kukatpally': { lat: 17.4938, lng: 78.3999, name: 'Kukatpally, Hyderabad' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad, Telangana' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
  'khammam': { lat: 17.2473, lng: 80.1514, name: 'Khammam, Telangana' },
  'warangal': { lat: 17.9689, lng: 79.5941, name: 'Warangal, Telangana' },
  
  // Andhra Pradesh
  'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada, Andhra Pradesh' },
  'iti road': { lat: 16.5062, lng: 80.6480, name: 'ITI Road, Vijayawada' },
  'guntur': { lat: 16.3067, lng: 80.4365, name: 'Guntur, Andhra Pradesh' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
  'vizag': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
  'ram nagar': { lat: 17.7230, lng: 83.3012, name: 'Ram Nagar, Visakhapatnam' },
  
  // Other Major Metros
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra' },
  'delhi': { lat: 28.7041, lng: 77.1025, name: 'New Delhi, Delhi' },
  'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune, Maharashtra' }
};

/**
 * Calculates straight-line and driving-adjusted distance (in KM) between two coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback reasonable distance

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  
  // Apply 1.22x road routing winding factor for realistic driving distance
  const roadEstimate = straightDistance * 1.22;
  return Math.round(roadEstimate * 10) / 10;
}

export interface ReverseGeocodeDetails {
  address: string;
  city: string;
  state: string;
  area: string;
  pinCode: string;
  country: string;
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  area?: string;
  pinCode?: string;
  country?: string;
}

function extractGoogleAddressComponents(result: any, lat: number, lng: number): ReverseGeocodeDetails {
  const comps: any[] = result.address_components || [];
  const getComp = (...types: string[]): string => {
    for (const type of types) {
      const match = comps.find((c: any) => c.types && c.types.includes(type));
      if (match) return match.long_name || match.short_name || '';
    }
    return '';
  };

  const pinCode = getComp('postal_code');
  const state = getComp('administrative_area_level_1');
  const city = getComp('locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_3');
  
  const sub1 = getComp('sublocality_level_1');
  const sub2 = getComp('sublocality_level_2');
  const sub = getComp('sublocality');
  const neighborhood = getComp('neighborhood');
  const route = getComp('route');

  let area = '';
  if (sub1 && sub2 && !sub1.toLowerCase().includes(sub2.toLowerCase())) {
    area = `${sub1} ${sub2}`;
  } else {
    area = sub1 || sub || neighborhood || sub2 || route || '';
  }

  const country = getComp('country') || 'India';
  const address = result.formatted_address || '';

  return {
    address,
    city,
    state,
    area,
    pinCode,
    country,
    lat,
    lng
  };
}

function extractNominatimAddressComponents(data: any, lat: number, lng: number): ReverseGeocodeDetails {
  const a = data.address || {};
  const pinCode = a.postcode || '';
  const state = a.state || '';
  const city = a.city || a.town || a.village || a.county || '';
  
  const suburb = a.suburb || '';
  const neighbourhood = a.neighbourhood || '';
  const residential = a.residential || '';
  const cityDistrict = a.city_district || '';
  const road = a.road || '';

  let area = '';
  if (neighbourhood && suburb && !neighbourhood.toLowerCase().includes(suburb.toLowerCase())) {
    area = `${neighbourhood}, ${suburb}`;
  } else {
    area = neighbourhood || suburb || residential || cityDistrict || road || '';
  }

  const country = a.country || 'India';
  const address = data.display_name || '';

  return {
    address,
    city,
    state,
    area,
    pinCode,
    country,
    lat,
    lng
  };
}

function extractBigDataCloudComponents(data: any, lat: number, lng: number): ReverseGeocodeDetails {
  const pinCode = data.postcode || '';
  const state = data.principalSubdivision || '';
  const city = data.city || data.locality || '';
  const area = data.locality || '';
  const country = data.countryName || 'India';
  const address = [area, city, state, pinCode, country].filter(Boolean).join(', ');

  return {
    address,
    city,
    state,
    area,
    pinCode,
    country,
    lat,
    lng
  };
}

function getKnownCityFallback(lat: number, lng: number): ReverseGeocodeDetails {
  let minDistance = Infinity;
  let closestCity = { lat: 12.9348, lng: 77.6189, name: 'Koramangala, Bengaluru' };

  for (const item of Object.values(KNOWN_CITIES)) {
    const dist = calculateDistanceKm(lat, lng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = item;
    }
  }

  const parts = closestCity.name.split(',');
  const area = parts[0]?.trim() || 'Koramangala';
  const city = parts[1]?.trim() || 'Bengaluru';

  return {
    address: closestCity.name,
    city,
    state: 'Karnataka',
    area,
    pinCode: '560095',
    country: 'India',
    lat,
    lng
  };
}

/**
 * Geocodes an address or city query using Google Geocoding API / Nominatim / offline cache
 */
export async function geocodeLocation(
  query: string,
  apiKey?: string
): Promise<GeocodeResult | null> {
  if (!query || !query.trim()) return null;
  const cleanQuery = query.trim().toLowerCase();
  
  // 1. Check known cities/localities first for instant responsiveness
  for (const [key, val] of Object.entries(KNOWN_CITIES)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      const parts = val.name.split(',');
      return {
        lat: val.lat,
        lng: val.lng,
        formattedAddress: val.name,
        area: parts[0]?.trim(),
        city: parts[1]?.trim() || 'Bengaluru',
        state: 'Karnataka',
        country: 'India'
      };
    }
  }

  // 2. Try Backend API Proxy first (avoids CORS / key restrictions in browser)
  try {
    const proxyRes = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (proxyData.success && proxyData.result) {
        const first = proxyData.result;
        const location = first.geometry?.location || { lat: 12.9348, lng: 77.6189 };
        const details = extractGoogleAddressComponents(first, location.lat, location.lng);
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: details.address,
          city: details.city,
          state: details.state,
          area: details.area,
          pinCode: details.pinCode,
          country: details.country
        };
      }
    }
  } catch (err) {
    // Continue to direct Google API
  }

  // 3. Direct Google Geocoding API if key provided
  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (key && key !== 'YOUR_GOOGLE_MAPS_KEY') {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const first = data.results[0];
        const location = first.geometry.location;
        const details = extractGoogleAddressComponents(first, location.lat, location.lng);
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: details.address,
          city: details.city,
          state: details.state,
          area: details.area,
          pinCode: details.pinCode,
          country: details.country
        };
      }
    } catch (err) {
      console.warn('Google Geocoding API error:', err);
    }
  }

  // 4. Free OpenStreetMap Nominatim Geocoding API
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const parsed = extractNominatimAddressComponents(item, parseFloat(item.lat), parseFloat(item.lon));
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        formattedAddress: parsed.address,
        city: parsed.city,
        state: parsed.state,
        area: parsed.area,
        pinCode: parsed.pinCode,
        country: parsed.country
      };
    }
  } catch (e) {
    // Network or CORS fallback
  }

  // 5. Default fallback: Koramangala Bengaluru
  return {
    lat: 12.9352,
    lng: 77.6244,
    formattedAddress: query,
    city: 'Bengaluru',
    state: 'Karnataka',
    area: 'Koramangala',
    pinCode: '560095',
    country: 'India'
  };
}

/**
 * Detailed reverse geocoding to full address, city, state, area, pincode, coordinates
 */
export async function reverseGeocodeAddressDetails(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<ReverseGeocodeDetails> {
  // 1. Try Backend API Proxy first (cleanest, reliable, no browser restriction)
  try {
    const proxyRes = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (proxyData.success && proxyData.result) {
        return extractGoogleAddressComponents(proxyData.result, lat, lng);
      }
    }
  } catch (err) {
    // Continue to direct Google API
  }

  // 2. Direct Google Geocoding API if key available
  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (key && key !== 'YOUR_GOOGLE_MAPS_KEY') {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return extractGoogleAddressComponents(data.results[0], lat, lng);
      }
    } catch (err) {
      console.warn('Google Reverse Geocoding error:', err);
    }
  }

  // 3. OpenStreetMap Nominatim Reverse Geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && (data.address || data.display_name)) {
      return extractNominatimAddressComponents(data, lat, lng);
    }
  } catch (e) {
    // Fallback to next provider
  }

  // 4. BigDataCloud Client Reverse Geocoding
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await res.json();
    if (data && (data.city || data.locality || data.principalSubdivision)) {
      return extractBigDataCloudComponents(data, lat, lng);
    }
  } catch (e) {
    // Fallback to closest centroid
  }

  // 5. Fallback: Closest centroid from KNOWN_CITIES
  return getKnownCityFallback(lat, lng);
}

/**
 * Reverse geocodes coordinates to human readable city/location
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<string> {
  const details = await reverseGeocodeAddressDetails(lat, lng, apiKey);
  if (details.area && details.city && !details.area.includes(details.city)) {
    return `${details.area}, ${details.city}`;
  }
  return details.area || details.city || details.address;
}
