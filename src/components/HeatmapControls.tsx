export interface HeatmapSettings {
  intensity: number
  radius: number
  opacity: number
}

interface HeatmapControlsProps {
  settings: HeatmapSettings
  onSettingsChange: (settings: HeatmapSettings) => void
  isVisible: boolean
  onToggle: () => void
}

export function HeatmapControls({ 
  settings, 
  onSettingsChange, 
  isVisible, 
  onToggle 
}: HeatmapControlsProps) {
  const handleIntensityChange = (value: number) => {
    onSettingsChange({ ...settings, intensity: value })
  }

  const handleRadiusChange = (value: number) => {
    onSettingsChange({ ...settings, radius: value })
  }

  const handleOpacityChange = (value: number) => {
    onSettingsChange({ ...settings, opacity: value })
  }

  const resetToDefaults = () => {
    onSettingsChange({
      intensity: 1.2,
      radius: 25,
      opacity: 0.8
    })
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-600"
        title="Toggle Heatmap Controls"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </button>

      {/* Controls Panel */}
      {isVisible && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 w-80 max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Heatmap Controls
            </h3>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="space-y-6">
            {/* Intensity Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Intensity
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {settings.intensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.intensity}
                onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Radius Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Radius
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {settings.radius}px
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={settings.radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Opacity Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Opacity
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Transparent</span>
                <span>Opaque</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Adjust settings to customize heatmap appearance
            </p>
          </div>
        </div>
      )}
    </div>
  )
}