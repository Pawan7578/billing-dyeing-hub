import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import GSTInput, { GSTVerifiedData } from "@/components/GSTInput";
import { GSTValidationResult } from "@/lib/gst-utils";

interface CompanyProfile {
  id: string;
  company_name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  invoice_prefix: string;
  dyeing_prefix: string;
}

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [gstValidation, setGstValidation] = useState<GSTValidationResult | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    gstin: "",
    phone: "",
    email: "",
    invoice_prefix: "INV",
    dyeing_prefix: "DYE",
  });

  // Handle GST input change with validation
  const handleGSTChange = (value: string, validation: GSTValidationResult) => {
    setFormData({ ...formData, gstin: value });
    setGstValidation(validation);
  };

  // Handle GST verification auto-fill for company profile
  const handleGSTVerified = (data: GSTVerifiedData) => {
    setFormData(prev => ({
      ...prev,
      company_name: prev.company_name || data.legalName || "",
      address: prev.address || data.address || "",
    }));
  };

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("company_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setLogoPreview(data.logo_url);
        setFormData({
          company_name: data.company_name,
          address: data.address || "",
          gstin: data.gstin || "",
          phone: data.phone || "",
          email: data.email || "",
          invoice_prefix: data.invoice_prefix,
          dyeing_prefix: data.dyeing_prefix,
        });
      }
    } catch (error: any) {
      toast.error("Failed to fetch company profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoPreview;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload logo");
      console.error(error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const logoUrl = await uploadLogo();
      const dataToSave = {
        ...formData,
        logo_url: logoUrl,
      };

      if (profile) {
        const { error } = await supabase
          .from("company_profile")
          .update(dataToSave)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_profile")
          .insert(dataToSave);

        if (error) throw error;
      }

      toast.success("Company profile updated successfully");
      fetchCompanyProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your company profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>
            This information will appear on your invoices and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="h-24 w-24 object-contain border border-border rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your company logo (PNG, JPG, or SVG recommended)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <GSTInput
                  value={formData.gstin}
                  onChange={handleGSTChange}
                  onGSTVerified={handleGSTVerified}
                  autoVerify={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input
                  id="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dyeing_prefix">Dyeing Bill Prefix</Label>
                <Input
                  id="dyeing_prefix"
                  value={formData.dyeing_prefix}
                  onChange={(e) => setFormData({ ...formData, dyeing_prefix: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading || uploading}>
                {uploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
