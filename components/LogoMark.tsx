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
      <rect width="40" height="40" rx="10" fill="#c96442" />
      <rect x="11" y="9" width="18" height="22" rx="2.5" fill="white" fillOpacity="0.95" />
      <rect x="14" y="15" width="12" height="2" rx="1" fill="#c96442" />
      <rect x="14" y="19.5" width="9" height="2" rx="1" fill="#c96442" fillOpacity="0.7" />
      <rect x="14" y="24" width="10.5" height="2" rx="1" fill="#c96442" fillOpacity="0.5" />
    </svg>
  );
}
