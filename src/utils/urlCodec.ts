import type { ProcessedLocation } from './timelineProcessor'

export interface CountryVisit {
  countryCode: string
  count: number
}

const FORMAT_VERSION = 0x01
const SHORTS_PER_GROUP = 4 // lat delta, lng delta, count, repetitions (each int16/uint16)
const GRID_FACTOR = 5 // rounds to nearest 0.2 degree (~22 km)
const HASH_PREFIX = 'v1,'
const COUNTRY_HASH_PREFIX = 'c1,'
const COUNTRY_FORMAT_VERSION = 0x01

function toBase64Url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  const base64 = btoa(binString)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binString = atob(padded)
  return Uint8Array.from(binString, (c) => c.codePointAt(0)!)
}

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function packLocations(locations: ProcessedLocation[]): Uint8Array {
  // Sort by lat, lng, then count for optimal delta + RLE encoding
  const sorted = [...locations].sort((a, b) => {
    const latA = Math.round(a.latitude * GRID_FACTOR)
    const latB = Math.round(b.latitude * GRID_FACTOR)
    if (latA !== latB) return latA - latB
    const lngA = Math.round(a.longitude * GRID_FACTOR)
    const lngB = Math.round(b.longitude * GRID_FACTOR)
    if (lngA !== lngB) return lngA - lngB
    return a.count - b.count
  })

  // Group consecutive points with same (lat, lng, count) into runs
  const groups: { lat: number; lng: number; count: number; reps: number }[] = []
  for (const loc of sorted) {
    const lat = Math.round(loc.latitude * GRID_FACTOR)
    const lng = Math.round(loc.longitude * GRID_FACTOR)
    const count = Math.min(loc.count, 65535)
    const last = groups[groups.length - 1]
    if (last && last.lat === lat && last.lng === lng && last.count === count && last.reps < 65535) {
      last.reps++
    } else {
      groups.push({ lat, lng, count, reps: 1 })
    }
  }

  // Column-oriented layout: all latΔ, then all lngΔ, then all counts, then all reps.
  // Deflate compresses homogeneous runs of similar-magnitude values much better.
  const n = groups.length
  const buffer = new ArrayBuffer(1 + n * SHORTS_PER_GROUP * 2)
  const view = new DataView(buffer)

  view.setUint8(0, FORMAT_VERSION)

  const colSize = n * 2 // bytes per column (n × int16)
  const latOff = 1
  const lngOff = 1 + colSize
  const cntOff = 1 + colSize * 2
  const repOff = 1 + colSize * 3

  let prevLat = 0
  let prevLng = 0

  for (let i = 0; i < n; i++) {
    const g = groups[i]
    view.setInt16(latOff + i * 2, g.lat - prevLat, true)
    view.setInt16(lngOff + i * 2, g.lng - prevLng, true)
    view.setUint16(cntOff + i * 2, g.count, true)
    view.setUint16(repOff + i * 2, g.reps, true)
    prevLat = g.lat
    prevLng = g.lng
  }

  return new Uint8Array(buffer)
}

function unpackLocations(data: Uint8Array): ProcessedLocation[] {
  if (data.length < 1) return []

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const version = view.getUint8(0)

  if (version !== FORMAT_VERSION) return []

  const bodyBytes = data.length - 1
  const bytesPerGroup = SHORTS_PER_GROUP * 2
  if (bodyBytes % bytesPerGroup !== 0) return []

  const n = bodyBytes / bytesPerGroup
  const locations: ProcessedLocation[] = []

  const colSize = n * 2
  const latOff = 1
  const lngOff = 1 + colSize
  const cntOff = 1 + colSize * 2
  const repOff = 1 + colSize * 3

  let prevLat = 0
  let prevLng = 0

  for (let i = 0; i < n; i++) {
    prevLat += view.getInt16(latOff + i * 2, true)
    prevLng += view.getInt16(lngOff + i * 2, true)
    const count = view.getUint16(cntOff + i * 2, true)
    const reps = view.getUint16(repOff + i * 2, true)
    const latitude = prevLat / GRID_FACTOR
    const longitude = prevLng / GRID_FACTOR
    for (let r = 0; r < reps; r++) {
      locations.push({ latitude, longitude, count })
    }
  }

  return locations
}

// Round coordinates to a ~22 km grid without merging.
// Overlapping points at the same position preserve spatial density
// for the heatmap while preventing shared URLs from revealing
// precise locations.
function reduceResolution(locations: ProcessedLocation[]): ProcessedLocation[] {
  return locations.map((loc) => ({
    latitude: Math.round(loc.latitude * GRID_FACTOR) / GRID_FACTOR,
    longitude: Math.round(loc.longitude * GRID_FACTOR) / GRID_FACTOR,
    count: loc.count,
  }))
}

export async function encodeLocations(locations: ProcessedLocation[]): Promise<string> {
  const reduced = reduceResolution(locations)
  const raw = packLocations(reduced)
  const compressed = await compress(raw)
  return HASH_PREFIX + toBase64Url(compressed)
}

export async function decodeLocationsFromHash(hash: string): Promise<ProcessedLocation[] | null> {
  try {
    const cleaned = hash.startsWith('#') ? hash.slice(1) : hash

    if (!cleaned.startsWith(HASH_PREFIX)) return null

    const encoded = cleaned.slice(HASH_PREFIX.length)
    if (encoded.length === 0) return null

    const compressed = fromBase64Url(encoded)
    const raw = await decompress(compressed)
    const locations = unpackLocations(raw)

    return locations.length > 0 ? locations : null
  } catch {
    return null
  }
}

// Binary layout: [version: uint8] [cc1: 2 ASCII bytes] [count1: uint16 LE] [cc2...] ...
export async function encodeCountryData(countries: CountryVisit[]): Promise<string> {
  const buffer = new ArrayBuffer(1 + countries.length * 4)
  const view = new DataView(buffer)
  view.setUint8(0, COUNTRY_FORMAT_VERSION)

  for (let i = 0; i < countries.length; i++) {
    const offset = 1 + i * 4
    const cc = countries[i].countryCode
    view.setUint8(offset, cc.charCodeAt(0))
    view.setUint8(offset + 1, cc.charCodeAt(1))
    view.setUint16(offset + 2, Math.min(countries[i].count, 65535), true)
  }

  const compressed = await compress(new Uint8Array(buffer))
  return COUNTRY_HASH_PREFIX + toBase64Url(compressed)
}

export async function decodeCountryDataFromHash(hash: string): Promise<CountryVisit[] | null> {
  try {
    const cleaned = hash.startsWith('#') ? hash.slice(1) : hash

    if (!cleaned.startsWith(COUNTRY_HASH_PREFIX)) return null

    const encoded = cleaned.slice(COUNTRY_HASH_PREFIX.length)
    if (encoded.length === 0) return null

    const compressed = fromBase64Url(encoded)
    const raw = await decompress(compressed)

    if (raw.length < 1) return null
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)

    if (view.getUint8(0) !== COUNTRY_FORMAT_VERSION) return null

    const bodyBytes = raw.length - 1
    if (bodyBytes % 4 !== 0) return null

    const n = bodyBytes / 4
    const countries: CountryVisit[] = []

    for (let i = 0; i < n; i++) {
      const offset = 1 + i * 4
      const countryCode = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1))
      const count = view.getUint16(offset + 2, true)
      countries.push({ countryCode, count })
    }

    return countries.length > 0 ? countries : null
  } catch {
    return null
  }
}
