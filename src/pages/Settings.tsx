import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

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
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    gstin: "",
    phone: "",
    email: "",
    invoice_prefix: "INV",
    dyeing_prefix: "DYE",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (profile) {
        const { error } = await supabase
          .from("company_profile")
          .update(formData)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_profile")
          .insert(formData);

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
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
              <Button type="submit" disabled={loading}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
