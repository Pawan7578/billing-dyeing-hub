import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { validateGSTNumber, formatGSTNumber, GSTValidationResult } from "@/lib/gst-utils";
import { CheckCircle, XCircle, Loader2, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Interface for GST verification API response
export interface GSTVerifiedData {
  gstin: string;
  legalName: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  status: "Active" | "Inactive" | "Cancelled";
  registrationDate: string;
  businessType: string;
}

interface GSTInputProps {
  value: string;
  onChange: (value: string, validation: GSTValidationResult) => void;
  onStateDetected?: (state: string) => void;
  onGSTVerified?: (data: GSTVerifiedData) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  autoVerify?: boolean;
}

const GSTInput = ({ 
  value, 
  onChange, 
  onStateDetected,
  onGSTVerified,
  label = "GSTIN",
  required = false,
  disabled = false,
  autoVerify = true
}: GSTInputProps) => {
  const [validation, setValidation] = useState<GSTValidationResult | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<GSTVerifiedData | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [lastVerifiedGst, setLastVerifiedGst] = useState<string>("");

  // Validate GST format on value change
  useEffect(() => {
    if (value && value.length > 0) {
      const result = validateGSTNumber(value);
      setValidation(result);
      
      if (result.isValid && result.stateName && onStateDetected) {
        onStateDetected(result.stateName);
      }
    } else {
      setValidation(null);
      setVerifiedData(null);
      setVerificationError(null);
    }
  }, [value, onStateDetected]);

  // Verify GST with backend API
  const verifyGST = useCallback(async (gstin: string) => {
    // Prevent duplicate API calls
    if (gstin === lastVerifiedGst || isVerifying) {
      return;
    }

    const result = validateGSTNumber(gstin);
    if (!result.isValid) {
      setVerificationError("Invalid GST format");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedData(null);

    try {
      console.log("[GSTInput] Calling verify-gst edge function");
      
      const { data, error } = await supabase.functions.invoke('verify-gst', {
        body: { gstin: gstin.toUpperCase().trim() }
      });

      if (error) {
        console.error("[GSTInput] Edge function error:", error);
        throw new Error(error.message || "Verification failed");
      }

      if (data.success && data.data) {
        console.log("[GSTInput] Verification successful:", data.data);
        setVerifiedData(data.data);
        setLastVerifiedGst(gstin);
        
        // Notify parent component with verified data
        if (onGSTVerified) {
          onGSTVerified(data.data);
        }
        
        // Update state if detected
        if (onStateDetected && data.data.state) {
          onStateDetected(data.data.state);
        }

        toast.success("GST verified successfully", {
          description: `${data.data.legalName} - ${data.data.status}`
        });
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error: any) {
      console.error("[GSTInput] Verification error:", error);
      setVerificationError(error.message || "Failed to verify GST");
      toast.error("GST verification failed", {
        description: error.message || "Please check the GST number and try again"
      });
    } finally {
      setIsVerifying(false);
    }
  }, [lastVerifiedGst, isVerifying, onGSTVerified, onStateDetected]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatGSTNumber(e.target.value);
    const result = validateGSTNumber(formatted);
    setValidation(result);
    setVerifiedData(null);
    setVerificationError(null);
    onChange(formatted, result);
  };

  // Handle blur - auto verify if enabled
  const handleBlur = () => {
    setIsTouched(true);
    if (autoVerify && value && value.length === 15 && validation?.isValid && value !== lastVerifiedGst) {
      verifyGST(value);
    }
  };

  // Manual verify button click
  const handleVerifyClick = () => {
    if (value && validation?.isValid) {
      verifyGST(value);
    }
  };

  const showValidation = isTouched && value && value.length > 0;

  return (
    <div className="space-y-3">
      <Label htmlFor="gstin" className="flex items-center gap-2 flex-wrap">
        {label} {required && <span className="text-destructive">*</span>}
        {showValidation && validation && (
          validation.isValid ? (
            <Badge variant="outline" className="text-success border-success gap-1 text-xs">
              <CheckCircle className="h-3 w-3" />
              Valid Format
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive gap-1 text-xs">
              <XCircle className="h-3 w-3" />
              Invalid
            </Badge>
          )
        )}
        {verifiedData && (
          <Badge variant="outline" className="text-primary border-primary gap-1 text-xs">
            <CheckCircle className="h-3 w-3" />
            Verified - {verifiedData.status}
          </Badge>
        )}
      </Label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="gstin"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            disabled={disabled || isVerifying}
            className={`uppercase font-mono ${
              showValidation && validation
                ? validation.isValid 
                  ? "border-success focus-visible:ring-success" 
                  : "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleVerifyClick}
          disabled={disabled || isVerifying || !validation?.isValid || value === lastVerifiedGst}
          title="Verify GST"
        >
          {isVerifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Validation info */}
      {showValidation && validation && !verifiedData && (
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

      {/* Verification error */}
      {verificationError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{verificationError}</span>
        </div>
      )}
      
      {/* Verified data display */}
      {verifiedData && (
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">Legal Name</span>
              <p className="font-medium text-foreground">{verifiedData.legalName}</p>
            </div>
            {verifiedData.tradeName && verifiedData.tradeName !== verifiedData.legalName && (
              <div>
                <span className="text-muted-foreground text-xs">Trade Name</span>
                <p className="font-medium text-foreground">{verifiedData.tradeName}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs">State</span>
              <p className="font-medium text-foreground">{verifiedData.state} ({verifiedData.stateCode})</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">City</span>
              <p className="font-medium text-foreground">{verifiedData.city}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground text-xs">Address</span>
              <p className="font-medium text-foreground">{verifiedData.address}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Pincode</span>
              <p className="font-medium text-foreground">{verifiedData.pincode}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Business Type</span>
              <p className="font-medium text-foreground">{verifiedData.businessType}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GSTInput;
