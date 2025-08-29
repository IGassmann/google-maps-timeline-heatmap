// Simple country lookup based on coordinates
// This is a simplified version - in production you'd want a more comprehensive solution
export interface CountryInfo {
  name: string
  code: string
}

const COUNTRY_BOUNDARIES = [
  // North America
  { name: 'United States', code: 'US', bounds: { north: 49, south: 24, west: -125, east: -66 } },
  { name: 'Canada', code: 'CA', bounds: { north: 84, south: 41, west: -141, east: -52 } },
  { name: 'Mexico', code: 'MX', bounds: { north: 32, south: 14, west: -117, east: -86 } },
  
  // Europe
  { name: 'United Kingdom', code: 'GB', bounds: { north: 61, south: 49, west: -8, east: 2 } },
  { name: 'France', code: 'FR', bounds: { north: 51, south: 41, west: -5, east: 10 } },
  { name: 'Germany', code: 'DE', bounds: { north: 55, south: 47, west: 5, east: 16 } },
  { name: 'Italy', code: 'IT', bounds: { north: 47, south: 36, west: 6, east: 19 } },
  { name: 'Spain', code: 'ES', bounds: { north: 44, south: 35, west: -10, east: 5 } },
  { name: 'Netherlands', code: 'NL', bounds: { north: 54, south: 50, west: 3, east: 7 } },
  { name: 'Belgium', code: 'BE', bounds: { north: 51, south: 49, west: 2, east: 7 } },
  { name: 'Switzerland', code: 'CH', bounds: { north: 48, south: 45, west: 5, east: 11 } },
  { name: 'Austria', code: 'AT', bounds: { north: 49, south: 46, west: 9, east: 17 } },
  { name: 'Portugal', code: 'PT', bounds: { north: 42, south: 36, west: -10, east: -6 } },
  { name: 'Norway', code: 'NO', bounds: { north: 72, south: 57, west: 4, east: 31 } },
  { name: 'Sweden', code: 'SE', bounds: { north: 69, south: 55, west: 10, east: 24 } },
  { name: 'Denmark', code: 'DK', bounds: { north: 58, south: 54, west: 8, east: 15 } },
  
  // Asia
  { name: 'Japan', code: 'JP', bounds: { north: 46, south: 24, west: 129, east: 146 } },
  { name: 'China', code: 'CN', bounds: { north: 54, south: 18, west: 73, east: 135 } },
  { name: 'India', code: 'IN', bounds: { north: 37, south: 6, west: 68, east: 97 } },
  { name: 'South Korea', code: 'KR', bounds: { north: 39, south: 33, west: 125, east: 130 } },
  { name: 'Thailand', code: 'TH', bounds: { north: 21, south: 5, west: 97, east: 106 } },
  { name: 'Singapore', code: 'SG', bounds: { north: 1.5, south: 1.1, west: 103.6, east: 104.1 } },
  
  // South America
  { name: 'Brazil', code: 'BR', bounds: { north: 5, south: -34, west: -74, east: -34 } },
  { name: 'Argentina', code: 'AR', bounds: { north: -21, south: -55, west: -74, east: -53 } },
  { name: 'Chile', code: 'CL', bounds: { north: -17, south: -56, west: -81, east: -66 } },
  { name: 'Peru', code: 'PE', bounds: { north: -0.01, south: -18, west: -82, east: -68 } },
  { name: 'Colombia', code: 'CO', bounds: { north: 13, south: -4, west: -82, east: -66 } },
  
  // Oceania
  { name: 'Australia', code: 'AU', bounds: { north: -9, south: -44, west: 112, east: 154 } },
  { name: 'New Zealand', code: 'NZ', bounds: { north: -34, south: -47, west: 166, east: 179 } },
  
  // Africa
  { name: 'South Africa', code: 'ZA', bounds: { north: -22, south: -35, west: 16, east: 33 } },
  { name: 'Egypt', code: 'EG', bounds: { north: 32, south: 22, west: 24, east: 37 } },
  { name: 'Morocco', code: 'MA', bounds: { north: 36, south: 27, west: -14, east: -1 } },
  { name: 'Kenya', code: 'KE', bounds: { north: 5, south: -5, west: 33, east: 42 } },
]

function isInBounds(lat: number, lng: number, bounds: { north: number, south: number, west: number, east: number }): boolean {
  return lat <= bounds.north && 
         lat >= bounds.south && 
         lng >= bounds.west && 
         lng <= bounds.east
}

export function getCountryFromCoordinates(latitude: number, longitude: number): CountryInfo | null {
  for (const country of COUNTRY_BOUNDARIES) {
    if (isInBounds(latitude, longitude, country.bounds)) {
      return { name: country.name, code: country.code }
    }
  }
  
  // Fallback based on general regions
  if (latitude >= 24 && latitude <= 49 && longitude >= -125 && longitude <= -66) {
    return { name: 'United States', code: 'US' }
  }
  if (latitude >= 35 && latitude <= 60 && longitude >= -10 && longitude <= 30) {
    return { name: 'Europe', code: 'EU' }
  }
  if (latitude >= -40 && latitude <= 40 && longitude >= 60 && longitude <= 150) {
    return { name: 'Asia', code: 'AS' }
  }
  if (latitude >= -60 && latitude <= 15 && longitude >= -80 && longitude <= -30) {
    return { name: 'South America', code: 'SA' }
  }
  if (latitude >= -40 && latitude <= 40 && longitude >= -20 && longitude <= 60) {
    return { name: 'Africa', code: 'AF' }
  }
  if (latitude >= -50 && latitude <= -10 && longitude >= 110 && longitude <= 180) {
    return { name: 'Australia/Oceania', code: 'OC' }
  }
  
  return { name: 'Unknown', code: 'XX' }
}