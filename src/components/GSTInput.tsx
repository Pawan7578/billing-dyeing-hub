import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { validateGSTNumber, formatGSTNumber, GSTValidationResult } from "@/lib/gst-utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface GSTInputProps {
  value: string;
  onChange: (value: string, validation: GSTValidationResult) => void;
  onStateDetected?: (state: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const GSTInput = ({ 
  value, 
  onChange, 
  onStateDetected,
  label = "GSTIN",
  required = false,
  disabled = false
}: GSTInputProps) => {
  const [validation, setValidation] = useState<GSTValidationResult | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    if (value && value.length > 0) {
      const result = validateGSTNumber(value);
      setValidation(result);
      
      if (result.isValid && result.stateName && onStateDetected) {
        onStateDetected(result.stateName);
      }
    } else {
      setValidation(null);
    }
  }, [value, onStateDetected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatGSTNumber(e.target.value);
    const result = validateGSTNumber(formatted);
    setValidation(result);
    onChange(formatted, result);
  };

  const showValidation = isTouched && value && value.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="gstin" className="flex items-center gap-2">
        {label} {required && <span className="text-destructive">*</span>}
        {showValidation && validation && (
          validation.isValid ? (
            <Badge variant="outline" className="text-success border-success gap-1 text-xs">
              <CheckCircle className="h-3 w-3" />
              Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive gap-1 text-xs">
              <XCircle className="h-3 w-3" />
              Invalid
            </Badge>
          )
        )}
      </Label>
      
      <div className="relative">
        <Input
          id="gstin"
          value={value}
          onChange={handleChange}
          onBlur={() => setIsTouched(true)}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          disabled={disabled}
          className={`uppercase font-mono ${
            showValidation && validation
              ? validation.isValid 
                ? "border-success focus-visible:ring-success" 
                : "border-destructive focus-visible:ring-destructive"
              : ""
          }`}
        />
      </div>
      
      {showValidation && validation && (
        <div className="text-xs">
          {validation.isValid ? (
            <div className="flex flex-wrap gap-2 text-muted-foreground">
              <span className="bg-secondary px-2 py-0.5 rounded">
                State: <span className="font-medium text-foreground">{validation.stateName}</span>
              </span>
              <span className="bg-secondary px-2 py-0.5 rounded">
                PAN: <span className="font-medium text-foreground">{validation.pan}</span>
              </span>
            </div>
          ) : (
            <p className="text-destructive">{validation.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GSTInput;
