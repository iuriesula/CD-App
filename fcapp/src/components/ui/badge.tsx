interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "green" | "yellow" | "red" | "purple" | "gray" | "cyan" | "orange" | "pink";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-gray-100 text-gray-900 border border-gray-200",
  blue: "bg-blue-100 text-blue-900 border border-blue-200",
  green: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  yellow: "bg-amber-100 text-amber-900 border border-amber-200",
  red: "bg-red-100 text-red-900 border border-red-200",
  purple: "bg-purple-100 text-purple-900 border border-purple-200",
  gray: "bg-slate-100 text-slate-700 border border-slate-200",
  cyan: "bg-teal-100 text-teal-900 border border-teal-200",
  orange: "bg-orange-100 text-orange-900 border border-orange-200",
  pink: "bg-pink-100 text-pink-900 border border-pink-200",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
