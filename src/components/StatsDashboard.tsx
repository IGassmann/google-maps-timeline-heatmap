import type { ProcessedLocation, ProcessingStats } from '../utils/timelineProcessor'
import { Button } from './ui/button'
import { Heading, Subheading } from './ui/heading'
import { Text, Strong } from './ui/text'
import { Badge } from './ui/badge'
import { Divider } from './ui/divider'
import { DescriptionList, DescriptionTerm, DescriptionDetails } from './ui/description-list'

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

export function StatsDashboard({ locations, stats, isVisible, onToggle }: StatsDashboardProps) {
  const totalDuration = locations.reduce((sum, loc) => sum + loc.totalDuration, 0)

  const locationTypes = locations.reduce((acc, loc) => {
    const type = loc.semanticType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="absolute top-4 left-4 z-20">
      <Button
        plain
        onClick={onToggle}
        className="mb-2 !p-2 rounded-lg shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 bg-white dark:bg-zinc-900"
        aria-label="Toggle Statistics Dashboard"
      >
        <svg className="w-5 h-5" data-slot="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </Button>

      {isVisible && (
        <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-zinc-950/10 w-80 max-w-sm max-h-[80vh] overflow-y-auto dark:bg-zinc-900 dark:ring-white/10">
          <Heading level={3} className="mb-4">
            Timeline Statistics
          </Heading>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {locations.length.toLocaleString()}
                </div>
                <Text className="!text-xs !text-blue-600 dark:!text-blue-400">Locations</Text>
              </div>

              <div className="bg-green-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.validLocations.toLocaleString()}
                </div>
                <Text className="!text-xs !text-green-600 dark:!text-green-400">Total Visits</Text>
              </div>

              <div className="bg-purple-500/10 p-3 rounded-lg col-span-2">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatDuration(totalDuration)}
                </div>
                <Text className="!text-xs !text-purple-600 dark:!text-purple-400">Total Time</Text>
              </div>
            </div>

            {stats.dateRange.start && stats.dateRange.end && (
              <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-lg">
                <Subheading level={4} className="mb-1">
                  Time Period
                </Subheading>
                <Text className="!text-sm">
                  {stats.dateRange.start.toLocaleDateString()} - {stats.dateRange.end.toLocaleDateString()}
                </Text>
                <Text className="!text-xs mt-1">
                  {Math.ceil((stats.dateRange.end.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
                </Text>
              </div>
            )}

            <div>
              <Subheading level={4} className="mb-2">
                Location Types
              </Subheading>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(locationTypes)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <Badge key={type} color="zinc">
                      {type.replace(/([A-Z])/g, ' $1').trim()}: {count}
                    </Badge>
                  ))}
              </div>
            </div>

            <Divider soft />

            <DescriptionList>
              <DescriptionTerm>Avg. visit duration</DescriptionTerm>
              <DescriptionDetails>
                <Strong>{formatDuration(locations.length > 0 ? totalDuration / stats.validLocations : 0)}</Strong>
              </DescriptionDetails>
              <DescriptionTerm>Invalid entries</DescriptionTerm>
              <DescriptionDetails>
                <Strong>{stats.invalidEntries.toLocaleString()}</Strong>
              </DescriptionDetails>
            </DescriptionList>
          </div>
        </div>
      )}
    </div>
  )
}
