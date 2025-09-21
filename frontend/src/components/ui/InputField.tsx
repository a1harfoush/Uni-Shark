// /frontend/src/components/ui/InputField.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-body text-text-primary">
        <div className="flex items-center gap-2 sm:w-auto">
          <span className="text-accent-primary">{">"}</span>
          <label htmlFor={props.id} className="text-sm sm:w-32 sm:flex-shrink-0">
            {label}:
          </label>
        </div>
        <input
          ref={ref}
          className={cn(
            "w-full bg-background-secondary border-b-2 border-state-disabled focus:border-accent-primary focus:outline-none focus:ring-0 focus:shadow-glow-primary transition-all duration-300 p-1 ml-6 sm:ml-0",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
InputField.displayName = "InputField";
export { InputField };