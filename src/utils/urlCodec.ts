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
const COUNTRY_FORMAT_VERSION = 0x02

// All ISO 3166-1 alpha-2 codes in a fixed order.
// Index into this array is the 1-byte country identifier used in the binary format.
// prettier-ignore
const COUNTRY_INDEX: readonly string[] = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AT','AU','AW','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BM','BN','BO','BR','BS','BT','BW','BY','BZ',
  'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','ER','ES','ET',
  'FI','FJ','FM','FR',
  'GA','GB','GD','GE','GH','GM','GN','GP','GQ','GR','GT','GW','GY',
  'HN','HR','HT','HU',
  'ID','IE','IL','IN','IQ','IR','IS','IT',
  'JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MG','MK','ML','MM','MN','MR','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NE','NG','NI','NL','NO','NP','NR','NZ',
  'OM',
  'PA','PE','PG','PH','PK','PL','PM','PR','PT','PW','PY',
  'QA',
  'RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SY','SZ',
  'TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ',
  'VA','VC','VE','VN','VU',
  'WS',
  'XK',
  'YE',
  'ZA','ZM','ZW',
] as const

const CODE_TO_INDEX = new Map(COUNTRY_INDEX.map((c, i) => [c, i]))

const LOG_BUCKET_COUNT = 16

// Quantize a raw count to a 0–15 log-scale bucket.
// Bucket 0 = count 0, bucket 15 = highest observed count.
function quantizeCounts(countries: CountryVisit[]): { code: string; bucket: number }[] {
  if (countries.length === 0) return []
  const maxCount = Math.max(...countries.map(c => c.count))
  const logMax = Math.log(maxCount + 1)
  return countries.map(c => ({
    code: c.countryCode,
    bucket: maxCount === 0 ? 0 : Math.round((Math.log(c.count + 1) / logMax) * (LOG_BUCKET_COUNT - 1)),
  }))
}

// Reverse: expand a 0–15 bucket back to a representative count.
// The exact original count is lost, but the relative ordering and
// log-scale visual weight are preserved.
function dequantizeBucket(bucket: number): number {
  if (bucket === 0) return 0
  // Map bucket back to a representative value using exponential scale.
  // bucket 15 → 1000 (arbitrary ceiling that produces good ln() values for the choropleth)
  const maxRepr = 1000
  return Math.round(Math.exp((bucket / (LOG_BUCKET_COUNT - 1)) * Math.log(maxRepr + 1)) - 1)
}

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

// Binary layout v2 — column-oriented, sorted + delta-encoded indices, nibble-packed buckets:
// [version: uint8] [n: uint8] [index deltas: n bytes] [nibble-packed buckets: ceil(n/2) bytes]
// Indices are sorted ascending and delta-encoded for better deflate compression.
// Buckets (0-15) are packed two per byte (high nibble first).
export async function encodeCountryData(countries: CountryVisit[]): Promise<string> {
  const quantized = quantizeCounts(countries)
  const entries = quantized
    .filter(e => CODE_TO_INDEX.has(e.code))
    .map(e => ({ idx: CODE_TO_INDEX.get(e.code)!, bucket: e.bucket }))
    .sort((a, b) => a.idx - b.idx)

  const n = entries.length
  const bucketBytes = Math.ceil(n / 2)
  const buffer = new Uint8Array(1 + 1 + n + bucketBytes)

  buffer[0] = COUNTRY_FORMAT_VERSION
  buffer[1] = n

  // Column 1: delta-encoded indices
  let prevIdx = 0
  for (let i = 0; i < n; i++) {
    buffer[2 + i] = entries[i].idx - prevIdx
    prevIdx = entries[i].idx
  }

  // Column 2: nibble-packed buckets (high nibble first)
  const bucketOff = 2 + n
  for (let i = 0; i < n; i += 2) {
    const hi = entries[i].bucket & 0x0f
    const lo = (i + 1 < n) ? (entries[i + 1].bucket & 0x0f) : 0
    buffer[bucketOff + (i >> 1)] = (hi << 4) | lo
  }

  const compressed = await compress(buffer)
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

    if (raw.length < 2) return null
    if (raw[0] !== COUNTRY_FORMAT_VERSION) return null

    const n = raw[1]
    const bucketBytes = Math.ceil(n / 2)
    if (raw.length !== 1 + 1 + n + bucketBytes) return null

    const bucketOff = 2 + n
    const countries: CountryVisit[] = []

    let prevIdx = 0
    for (let i = 0; i < n; i++) {
      prevIdx += raw[2 + i]
      const nibbleByte = raw[bucketOff + (i >> 1)]
      const bucket = (i % 2 === 0) ? (nibbleByte >> 4) : (nibbleByte & 0x0f)
      if (prevIdx < COUNTRY_INDEX.length) {
        countries.push({ countryCode: COUNTRY_INDEX[prevIdx], count: dequantizeBucket(bucket) })
      }
    }

    return countries.length > 0 ? countries : null
  } catch {
    return null
  }
}
