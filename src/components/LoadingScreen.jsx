export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] px-6">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--color-sage-200)] bg-white/85 p-10 text-center shadow-[0_24px_80px_rgba(91,111,87,0.18)] backdrop-blur">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-[radial-gradient(circle_at_top,#f8dfc4,transparent_65%),var(--color-sage-500)]" />
        <p className="font-display text-4xl text-[var(--color-ink)]">
          Daily Journal Card
        </p>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Opening your journal and checking your saved day...
        </p>
      </div>
    </div>
  )
}
