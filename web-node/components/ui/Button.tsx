import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-neutral-800 border border-foreground",
  secondary: "bg-transparent text-foreground border border-foreground hover:bg-foreground hover:text-background",
  danger: "bg-transparent text-foreground border border-foreground hover:bg-red-600 hover:text-white hover:border-red-600",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-5 py-2.5 text-sm font-medium tracking-wide uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
