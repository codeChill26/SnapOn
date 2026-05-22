export function SnapOnLogo({ size = 'md', dark = false }: { size?: 'sm' | 'md' | 'lg'; dark?: boolean }) {
  const sizes = { sm: 'h-7', md: 'h-10', lg: 'h-14' };
  const textSizes = { sm: '1.1rem', md: '1.5rem', lg: '2rem' };
  const dotSizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' };

  return (
    <div className={`flex items-center gap-1 ${sizes[size]}`}>
      {/* Icon mark */}
      <div className="relative flex-shrink-0" style={{ width: size === 'sm' ? 28 : size === 'md' ? 40 : 52, height: size === 'sm' ? 28 : size === 'md' ? 40 : 52 }}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Rounded square bg */}
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#snapGrad)" />
          {/* Lightning bolt */}
          <path d="M22.5 8L13 22h6l-2 10L27 18h-6l1.5-10z" fill="white" strokeLinejoin="round" />
          {/* Subtle shine */}
          <rect x="2" y="2" width="36" height="18" rx="10" fill="white" opacity="0.12" />
          <defs>
            <linearGradient id="snapGrad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f97316" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Text */}
      <div className="flex items-baseline" style={{ fontSize: textSizes[size], lineHeight: 1 }}>
        <span style={{ fontWeight: 800, color: dark ? 'white' : '#1f2937', letterSpacing: '-0.02em' }}>
          Snap
        </span>
        <span style={{ fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>
          On
        </span>
        <div className={`${dotSizes[size]} rounded-full bg-orange-500 ml-0.5 mb-auto mt-1`} />
      </div>
    </div>
  );
}
