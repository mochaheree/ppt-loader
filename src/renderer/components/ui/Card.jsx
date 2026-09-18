// Vega style: 1px border, generous padding, radius from the preset.
export default function Card({ title = '', description = '', className = '', action, children }) {
  return (
    <section className={`rounded-lg border border-border bg-card text-card-foreground ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <h2 className="font-heading text-[15px] font-semibold leading-none tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={`px-6 ${title ? 'pb-6' : 'py-6'}`}>{children}</div>
    </section>
  );
}
