export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" className="fill-accent" />
      <path d="M14 6.5l6 2.4v4.6c0 3.9-2.6 6.7-6 8-3.4-1.3-6-4.1-6-8V8.9l6-2.4z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M11.2 14l2 2 3.8-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
