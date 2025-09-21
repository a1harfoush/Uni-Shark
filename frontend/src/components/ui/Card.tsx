import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-background-secondary/80 border border-state-disabled rounded-sm p-4 md:p-6 shadow-lg backdrop-blur-sm",
          "before:content-[''] before:absolute before:w-3 before:h-3 md:before:w-4 md:before:h-4 before:top-[-1px] before:left-[-1px] before:border-l-2 before:border-t-2 before:border-text-secondary",
          "after:content-[''] after:absolute after:w-3 after:h-3 md:after:w-4 md:after:h-4 after:bottom-[-1px] after:right-[-1px] after:border-r-2 after:border-b-2 after:border-text-secondary",
          "transition-all duration-300",
          interactive && "hover:border-accent-primary hover:shadow-glow-primary hover:before:border-accent-primary hover:after:border-accent-primary",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export { Card };