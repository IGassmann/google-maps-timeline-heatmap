import { useCallback, useState, useRef } from 'react'
import type { TimelineEntry } from '../utils/timelineProcessor'

interface FileUploadProps {
  onFileSelect: (data: TimelineEntry[]) => void
  onError: (error: string) => void
}

export function FileUpload({ onFileSelect, onError }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      onError('Please select a JSON file')
      return
    }

    setIsLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data)) {
        throw new Error('Invalid format: Expected an array of timeline entries')
      }

      onFileSelect(data)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to parse JSON file')
    } finally {
      setIsLoading(false)
    }
  }, [onFileSelect, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
          ${isDragOver
            ? 'border-blue-400 bg-blue-500/5'
            : 'border-zinc-950/10 dark:border-white/15 hover:border-zinc-950/20 dark:hover:border-white/25'
          }
          ${isLoading ? 'opacity-75 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Processing timeline data...</p>
          </div>
        ) : (
          <>
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white mb-2">
              Upload Google Maps Timeline
            </h3>
            <p className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400 mb-4">
              Drag and drop your timeline JSON file here, or click to browse
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your data stays private - all processing happens in your browser
            </p>
            <div className="mt-6 pt-6 border-t border-zinc-950/5 dark:border-white/5 text-left">
              <strong className="text-sm font-medium text-zinc-950 dark:text-white block mb-2">
                How to get your Timeline data:
              </strong>
              <div className="space-y-3">
                <div>
                  <strong className="text-sm font-medium text-zinc-950 dark:text-white">Android</strong>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Settings → Location → Timeline → Export Timeline Data</p>
                </div>
                <div>
                  <strong className="text-sm font-medium text-zinc-950 dark:text-white">iPhone</strong>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Google Maps → Profile icon → Your Timeline → ⋯ → Location and privacy settings → Export Timeline data</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Transfer the exported JSON file to your computer via AirDrop, Google Drive, or USB.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
          </>
        )}
      </div>
    </div>
  )
}
