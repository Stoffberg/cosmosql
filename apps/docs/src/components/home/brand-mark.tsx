type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 19 19"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M.5.5h18v18H.5zM6.5.5v18M12.5.5v18M.5 6.5h18M.5 12.5h18"
        fill="none"
        stroke="currentColor"
      />
      <rect
        x="13"
        y="7"
        width="5"
        height="5"
        className="brand-mark-cell fill-signal"
      />
    </svg>
  );
}
