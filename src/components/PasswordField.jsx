import { Eye, EyeOff } from 'lucide-react'

const INPUT_CLASS =
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 pr-14 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.15)]'

export default function PasswordField({
  autoComplete = 'current-password',
  label,
  onChange,
  onToggle,
  placeholder,
  value,
  visible,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
        {label}
      </span>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={INPUT_CLASS}
          onChange={onChange}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--color-muted)] transition hover:bg-[var(--color-sage-100)] hover:text-[var(--color-ink)]"
          onClick={onToggle}
          type="button"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  )
}
