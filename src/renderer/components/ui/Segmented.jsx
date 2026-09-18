// Same segmented control the header tabs use: reads as a mode switch, which is
// what scale modes and autopilot direction both are.
export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex gap-1 rounded-md bg-secondary p-1 ${className}`}>
      {options.map(({ value: option, label, disabled, title }) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          title={title}
          onClick={() => onChange(option)}
          className={`rounded-sm px-3 py-1 text-[13px] font-medium transition-colors
            disabled:pointer-events-none disabled:opacity-40
            ${option === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
