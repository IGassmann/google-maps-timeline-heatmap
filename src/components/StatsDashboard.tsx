import type { ProcessedLocation, ProcessingStats } from '../utils/timelineProcessor'

interface StatsDashboardProps {
  locations: ProcessedLocation[]
  stats: ProcessingStats
  isVisible: boolean
  onToggle: () => void
}

function formatDuration(milliseconds: number): string {
  if (milliseconds === 0) return '0 mins'
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  
  return parts.length > 0 ? parts.join(' ') : '0 mins'
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  } else if (meters < 100000) {
    return `${(meters / 1000).toFixed(1)}km`
  } else {
    return `${Math.round(meters / 1000)}km`
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

function calculateTotalDistance(locations: ProcessedLocation[]): number {
  if (locations.length < 2) return 0
  
  // Sort by total duration to approximate chronological order
  const sortedLocations = [...locations].sort((a, b) => a.totalDuration - b.totalDuration)
  
  let totalDistance = 0
  for (let i = 1; i < sortedLocations.length; i++) {
    const prev = sortedLocations[i - 1]
    const curr = sortedLocations[i]
    totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
  }
  
  return totalDistance
}

export function StatsDashboard({ locations, stats, isVisible, onToggle }: StatsDashboardProps) {
  const totalDuration = locations.reduce((sum, loc) => sum + loc.totalDuration, 0)
  const totalDistance = calculateTotalDistance(locations)
  const averageVisitDuration = locations.length > 0 ? totalDuration / stats.validLocations : 0
  
  const locationTypes = locations.reduce((acc, loc) => {
    const type = loc.semanticType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="absolute top-4 left-4 z-20">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-600"
        title="Toggle Statistics Dashboard"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 w-80 max-w-sm max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Timeline Statistics
            </h3>
          </div>

          <div className="space-y-4">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {locations.length.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Locations</div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.validLocations.toLocaleString()}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Total Visits</div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatDuration(totalDuration)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Total Time</div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatDistance(totalDistance)}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">Est. Distance</div>
              </div>
            </div>

            {/* Date Range */}
            {stats.dateRange.start && stats.dateRange.end && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Time Period
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {stats.dateRange.start.toLocaleDateString()} - {stats.dateRange.end.toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Math.ceil((stats.dateRange.end.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            )}

            {/* Location Types */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Location Types
              </h4>
              <div className="space-y-1">
                {Object.entries(locationTypes)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Additional Stats */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg. visit duration:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDuration(averageVisitDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Invalid entries:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stats.invalidEntries.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}