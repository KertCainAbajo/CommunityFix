export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="5.4" y="5.4" width="21.2" height="21.2" rx="3" transform="rotate(45 16 16)" fill="#ffc20e" />
      <path
        d="M10.5 16.5l3.8 3.8 7.2-8.6"
        fill="none"
        stroke="#17191a"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
