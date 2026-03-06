import { useCallback, useState } from 'react'

interface ShareButtonProps {
  onShare: () => Promise<string>
}

export function ShareButton({ onShare }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = await onShare()
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — no-op
    }
  }, [onShare])

  return (
    <button
      onClick={handleShare}
      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {copied ? 'Link Copied!' : 'Share'}
    </button>
  )
}
