/**
 * Google Maps Geocoding & Distance Utilities for Insta Token
 */

// Popular City Coordinate Fallback Cache for instant lookup
export const KNOWN_CITIES: Record<string, { lat: number; lng: number; name: string }> = {
  'khammam': { lat: 17.2473, lng: 80.1514, name: 'Khammam, Telangana' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad, Telangana' },
  'warangal': { lat: 17.9689, lng: 79.5941, name: 'Warangal, Telangana' },
  'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada, Andhra Pradesh' },
  'guntur': { lat: 16.3067, lng: 80.4365, name: 'Guntur, Andhra Pradesh' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
  'vizag': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
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
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback reasonable OPD distance

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
  
  // Apply 1.2x road routing winding factor for realistic driving distance
  const roadEstimate = straightDistance * 1.22;
  return Math.round(roadEstimate * 10) / 10;
}

/**
 * Geocodes an address or city query using Google Geocoding API or offline fallback
 */
export async function geocodeLocation(
  query: string,
  apiKey?: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const cleanQuery = query.trim().toLowerCase();
  
  // Check known cities first for instant responsiveness
  for (const [key, val] of Object.entries(KNOWN_CITIES)) {
    if (cleanQuery.includes(key)) {
      return {
        lat: val.lat,
        lng: val.lng,
        formattedAddress: val.name
      };
    }
  }

  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || key === 'YOUR_GOOGLE_MAPS_KEY') {
    // If no API key, return default Hyderabad coordinates
    return {
      lat: 17.3850,
      lng: 78.4867,
      formattedAddress: query
    };
  }

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
    console.error('Geocoding API error:', err);
  }

  return {
    lat: 17.3850,
    lng: 78.4867,
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
  const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || key === 'YOUR_GOOGLE_MAPS_KEY') {
    // Determine closest known city
    let minDistance = Infinity;
    let closestName = 'Hyderabad, Telangana';
    for (const city of Object.values(KNOWN_CITIES)) {
      const dist = calculateDistanceKm(lat, lng, city.lat, city.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestName = city.name;
      }
    }
    return closestName;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (err) {
    console.error('Reverse Geocoding error:', err);
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
