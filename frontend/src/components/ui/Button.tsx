import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-heading font-bold border-none transition-all duration-200 uppercase tracking-wider animate-flicker active:scale-95 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent-primary text-background-primary hover:bg-white hover:shadow-glow-primary": variant === "default" || variant === "primary",
            "bg-state-error text-text-heading hover:bg-state-error/90 hover:shadow-glow-error": variant === "destructive",
            "border-2 border-accent-primary bg-transparent hover:bg-accent-primary/20 hover:shadow-glow-primary text-accent-primary": variant === "outline",
            "bg-background-secondary text-text-secondary hover:bg-background-secondary/80 border-2 border-state-disabled": variant === "secondary",
            "hover:bg-accent-primary/20 hover:text-accent-primary text-text-secondary": variant === "ghost",
            "text-accent-primary underline-offset-4 hover:underline hover:text-accent-secondary bg-transparent border-none normal-case tracking-normal": variant === "link",
          },
          {
            "px-8 py-3 text-sm": size === "default",
            "px-6 py-2 text-xs": size === "sm",
            "px-12 py-4 text-lg": size === "lg",
            "w-10 h-10 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };