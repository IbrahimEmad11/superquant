import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TextareaWithCounterProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  showCounter?: boolean;
}

export function TextareaWithCounter({
  value,
  onChange,
  placeholder,
  maxLength = 200,
  disabled,
  className,
  label,
  error,
  showCounter = true,
}: TextareaWithCounterProps) {
  const currentLength = value.length;
  const isNearLimit = currentLength > maxLength * 0.8;
  const isAtLimit = currentLength >= maxLength;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            "min-h-[100px] resize-y transition-all duration-200 pr-16",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
        />
        
        {showCounter && (
          <div className={cn(
            "absolute bottom-2 right-2 text-xs transition-colors duration-200 bg-background/80 backdrop-blur-sm px-2 py-1 rounded",
            isAtLimit 
              ? "text-destructive font-medium" 
              : isNearLimit 
                ? "text-amber-500" 
                : "text-muted-foreground"
          )}>
            {currentLength}/{maxLength}
          </div>
        )}
      </div>

      {showCounter && (
        <div className="flex justify-between items-center text-xs">
          <span className={cn(
            "transition-colors duration-200",
            error ? "text-destructive" : "text-muted-foreground"
          )}>
            {error || "Describe your database connection, schema, and relevant details"}
          </span>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-1 w-16 rounded-full bg-muted transition-all duration-300 relative overflow-hidden"
            )}>
              <div 
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  isAtLimit 
                    ? "bg-destructive" 
                    : isNearLimit 
                      ? "bg-amber-500" 
                      : "bg-primary"
                )}
                style={{ 
                  width: `${Math.min((currentLength / maxLength) * 100, 100)}%` 
                }}
              />
            </div>
            <span className={cn(
              "text-xs tabular-nums transition-colors duration-200 min-w-[3rem] text-right",
              isAtLimit 
                ? "text-destructive font-medium" 
                : isNearLimit 
                  ? "text-amber-500" 
                  : "text-muted-foreground"
            )}>
              {currentLength}/{maxLength}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}