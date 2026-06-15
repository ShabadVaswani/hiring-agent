type LogoMarkProps = {
  size?: number;
  className?: string;
};

export default function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="6" fill="#57068c" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fill="white"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="-0.04em"
      >
        SV
      </text>
    </svg>
  );
}
