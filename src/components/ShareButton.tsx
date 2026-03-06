import { useCallback, useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — no-op
    }
  }, [])

  return (
    <button
      onClick={handleShare}
      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {copied ? 'Link Copied!' : 'Share'}
    </button>
  )
}
