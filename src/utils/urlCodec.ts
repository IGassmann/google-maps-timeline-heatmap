import type { ProcessedLocation } from './timelineProcessor'

const FORMAT_VERSION = 0x01
const BYTES_PER_POINT = 10
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
  const buffer = new ArrayBuffer(1 + locations.length * BYTES_PER_POINT)
  const view = new DataView(buffer)

  view.setUint8(0, FORMAT_VERSION)

  for (let i = 0; i < locations.length; i++) {
    const offset = 1 + i * BYTES_PER_POINT
    const loc = locations[i]
    view.setInt32(offset, Math.round(loc.latitude * 1e5), true)
    view.setInt32(offset + 4, Math.round(loc.longitude * 1e5), true)
    view.setUint16(offset + 8, Math.min(loc.count, 65535), true)
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

  for (let i = 0; i < count; i++) {
    const offset = 1 + i * BYTES_PER_POINT
    locations.push({
      latitude: view.getInt32(offset, true) / 1e5,
      longitude: view.getInt32(offset + 4, true) / 1e5,
      count: view.getUint16(offset + 8, true),
    })
  }

  return locations
}

// Round coordinates to a ~1.1 km grid and merge colliding points.
// This keeps the heatmap recognizable while preventing shared URLs
// from revealing exact addresses.
function reduceResolution(locations: ProcessedLocation[]): ProcessedLocation[] {
  const decimals = 2
  const factor = 10 ** decimals
  const map = new Map<string, ProcessedLocation>()

  for (const loc of locations) {
    const lat = Math.round(loc.latitude * factor) / factor
    const lng = Math.round(loc.longitude * factor) / factor
    const key = `${lat},${lng}`

    const existing = map.get(key)
    if (existing) {
      existing.count += loc.count
    } else {
      map.set(key, { latitude: lat, longitude: lng, count: loc.count })
    }
  }

  return Array.from(map.values())
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
