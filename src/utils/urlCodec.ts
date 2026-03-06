import type { ProcessedLocation } from './timelineProcessor'

const FORMAT_VERSION = 0x01
const BYTES_PER_POINT = 6 // int16 lat delta + int16 lng delta + uint16 count
const GRID_FACTOR = 5 // rounds to nearest 0.2 degree (~22 km)
const HASH_PREFIX = 'v1,'

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
  // Sort by lat then lng for optimal delta encoding
  const sorted = [...locations].sort((a, b) => {
    const latA = Math.round(a.latitude * GRID_FACTOR)
    const latB = Math.round(b.latitude * GRID_FACTOR)
    if (latA !== latB) return latA - latB
    return Math.round(a.longitude * GRID_FACTOR) - Math.round(b.longitude * GRID_FACTOR)
  })

  const buffer = new ArrayBuffer(1 + sorted.length * BYTES_PER_POINT)
  const view = new DataView(buffer)

  view.setUint8(0, FORMAT_VERSION)

  let prevLat = 0
  let prevLng = 0

  for (let i = 0; i < sorted.length; i++) {
    const offset = 1 + i * BYTES_PER_POINT
    const lat = Math.round(sorted[i].latitude * GRID_FACTOR)
    const lng = Math.round(sorted[i].longitude * GRID_FACTOR)
    view.setInt16(offset, lat - prevLat, true)
    view.setInt16(offset + 2, lng - prevLng, true)
    view.setUint16(offset + 4, Math.min(sorted[i].count, 65535), true)
    prevLat = lat
    prevLng = lng
  }

  return new Uint8Array(buffer)
}

function unpackLocations(data: Uint8Array): ProcessedLocation[] {
  if (data.length < 1) return []

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const version = view.getUint8(0)

  if (version !== FORMAT_VERSION) return []

  const pointBytes = data.length - 1
  if (pointBytes % BYTES_PER_POINT !== 0) return []

  const count = pointBytes / BYTES_PER_POINT
  const locations: ProcessedLocation[] = []

  let prevLat = 0
  let prevLng = 0

  for (let i = 0; i < count; i++) {
    const offset = 1 + i * BYTES_PER_POINT
    prevLat += view.getInt16(offset, true)
    prevLng += view.getInt16(offset + 2, true)
    locations.push({
      latitude: prevLat / GRID_FACTOR,
      longitude: prevLng / GRID_FACTOR,
      count: view.getUint16(offset + 4, true),
    })
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
