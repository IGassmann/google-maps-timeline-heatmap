export function Spinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
      <p className="text-sm text-gray-500 dark:text-zinc-400">{message}</p>
    </div>
  )
}
