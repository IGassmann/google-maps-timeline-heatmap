import { useCallback, useState, useRef } from 'react'
import type { TimelineEntry } from '../utils/timelineProcessor'
import { Spinner } from './Spinner'

interface FileUploadProps {
  onFileSelect: (data: TimelineEntry[]) => void
  onError: (error: string) => void
}

export function FileUpload({ onFileSelect, onError }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
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
    e.target.value = ''
  }, [processFile])

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`
          group relative rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all cursor-pointer
          ${isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
            : 'border-gray-300 hover:border-gray-400 dark:border-zinc-700 dark:hover:border-zinc-500'
          }
          ${isLoading ? 'opacity-60 pointer-events-none' : ''}
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
          <Spinner message="Processing timeline data..." />
        ) : (
          <>
            <svg className="mx-auto h-10 w-10 text-gray-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <div className="mt-4">
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Upload a file</span>
              <span className="text-sm text-gray-500 dark:text-zinc-400"> or drag and drop</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              Timeline JSON export from Google Maps
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      <div className="mt-8 text-left">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-gray-900 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
            <svg className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            How to export your Timeline data
          </summary>
          <div className="mt-3 ml-6 space-y-3 text-sm text-gray-500 dark:text-zinc-400">
            <div>
              <p className="font-medium text-gray-700 dark:text-zinc-300">Android</p>
              <p>Settings &rarr; Location &rarr; Timeline &rarr; Export Timeline Data</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-zinc-300">iPhone</p>
              <p>Google Maps &rarr; Profile icon &rarr; Your Timeline &rarr; &#x22EF; &rarr; Location and privacy settings &rarr; Export Timeline data</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Transfer the exported JSON file to your computer via AirDrop, Google Drive, or USB.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}
