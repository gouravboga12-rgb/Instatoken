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

/**
 * Geocodes an address or city query using Google Geocoding API / Nominatim / offline cache
 */
export async function geocodeLocation(
  query: string,
  apiKey?: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  if (!query || !query.trim()) return null;
  const cleanQuery = query.trim().toLowerCase();
  
  // 1. Check known cities/localities first for instant responsiveness
  for (const [key, val] of Object.entries(KNOWN_CITIES)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      return {
        lat: val.lat,
        lng: val.lng,
        formattedAddress: val.name
      };
    }
  }

  // 2. Google Geocoding API if key provided
  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (key && key !== 'YOUR_GOOGLE_MAPS_KEY') {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: data.results[0].formatted_address
        };
      }
    } catch (err) {
      console.warn('Google Geocoding API error:', err);
    }
  }

  // 3. Free OpenStreetMap Nominatim Geocoding API
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const address = item.address;
      const locality = address.suburb || address.neighbourhood || address.city_district || address.city || address.town || address.village || query;
      const state = address.state ? `, ${address.state}` : '';
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        formattedAddress: `${locality}${state}`
      };
    }
  } catch (e) {
    // Network or CORS fallback
  }

  // 4. Default fallback: Koramangala Bengaluru
  return {
    lat: 12.9352,
    lng: 77.6244,
    formattedAddress: query
  };
}

/**
 * Reverse geocodes coordinates to human readable city/location
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<string> {
  // 1. Google Geocoding API if key available
  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (key && key !== 'YOUR_GOOGLE_MAPS_KEY') {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    } catch (err) {
      console.warn('Google Reverse Geocoding error:', err);
    }
  }

  // 2. OpenStreetMap Nominatim Reverse Geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      const area = a.suburb || a.neighbourhood || a.residential || a.city_district || a.road || a.city || a.town || 'Nearby Area';
      const city = a.city || a.town || a.county || a.state || '';
      return city ? `${area}, ${city}` : area;
    }
  } catch (e) {
    // Fallback to closest known centroid
  }

  // 3. Fallback: Determine closest known city/locality from KNOWN_CITIES
  let minDistance = Infinity;
  let closestName = 'Koramangala, Bengaluru';
  for (const city of Object.values(KNOWN_CITIES)) {
    const dist = calculateDistanceKm(lat, lng, city.lat, city.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestName = city.name;
    }
  }
  return closestName;
}
