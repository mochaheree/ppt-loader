export default function Field({ label = '', hint = '', htmlFor = '', className = '', children }) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {label && (
        <label className="text-[13px] font-medium leading-none" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-[12px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
