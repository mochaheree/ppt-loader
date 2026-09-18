export default function Toggle({ checked = false, label = '', hint = '', onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent
          transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60
          ${checked ? 'bg-primary-bright' : 'bg-secondary'}`}
      >
        <span
          className={`pointer-events-none block size-4 rounded-full bg-foreground shadow transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
      <span className="grid gap-1">
        <span className="text-[13px] font-medium leading-none">{label}</span>
        {hint && <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
