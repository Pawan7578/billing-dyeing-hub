import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, FileDown, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DyeingBill {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  customers: { name: string } | null;
}

const Dyeing = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<DyeingBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from("dyeing_bills")
        .select(`
          id,
          bill_number,
          bill_date,
          total_amount,
          paid_amount,
          status,
          customers (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch dyeing bills");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-success text-white";
      case "partial":
        return "bg-warning text-white";
      default:
        return "bg-destructive text-white";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dyeing Bills</h1>
          <p className="text-muted-foreground mt-1">Manage your dyeing bills</p>
        </div>
        <Button onClick={() => navigate("/dyeing/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Dyeing Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Dyeing Bills</CardTitle>
          <CardDescription>View and manage all your dyeing bills</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No dyeing bills found. Create your first bill!
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{bill.bill_number}</h3>
                      <Badge className={getStatusColor(bill.status)}>
                        {bill.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {bill.customers?.name || "Unknown Customer"} • {new Date(bill.bill_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-semibold">
                        ₹{bill.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="text-lg font-semibold text-success">
                        ₹{bill.paid_amount?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dyeing;
