import { Building2, Phone, Mail, MapPin } from "lucide-react";

interface CompanyProfile {
  company_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  logo_url?: string | null;
}

interface CompanyBrandingProps {
  company: CompanyProfile | null;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

const CompanyBranding = ({ company, size = "md", showDetails = true }: CompanyBrandingProps) => {
  if (!company) return null;

  const logoSizes = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  return (
    <div className="flex items-start gap-4">
      {/* Circular Logo Container */}
      <div className={`${logoSizes[size]} rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg`}>
        {company.logo_url ? (
          <img 
            src={company.logo_url} 
            alt={company.company_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 className={`${size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10"} text-primary`} />
        )}
      </div>

      {/* Company Details */}
      <div className="flex-1 min-w-0">
        <h2 className={`${textSizes[size]} font-bold text-foreground leading-tight`}>
          {company.company_name}
        </h2>
        
        {showDetails && (
          <div className="mt-1 space-y-0.5">
            {company.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{company.address}</span>
              </p>
            )}
            
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {company.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {company.phone}
                </p>
              )}
              {company.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {company.email}
                </p>
              )}
            </div>
            
            {company.gstin && (
              <p className="text-sm font-medium text-primary">
                GSTIN: {company.gstin}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyBranding;
