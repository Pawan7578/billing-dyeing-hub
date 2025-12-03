import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface CustomerCredit {
  totalBilled: number;
  totalPaid: number;
  pendingAmount: number;
  lastInvoiceDate: string | null;
}

interface CustomerCreditCardProps {
  customerId: string;
  customerName?: string;
}

const CustomerCreditCard = ({ customerId, customerName }: CustomerCreditCardProps) => {
  const [credit, setCredit] = useState<CustomerCredit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerCredit();
    } else {
      setCredit(null);
    }
  }, [customerId]);

  const fetchCustomerCredit = async () => {
    setLoading(true);
    try {
      // Fetch all invoices for this customer
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, invoice_date")
        .eq("customer_id", customerId)
        .order("invoice_date", { ascending: false });

      if (invoiceError) throw invoiceError;

      // Fetch all dyeing bills for this customer
      const { data: dyeingBills, error: dyeingError } = await supabase
        .from("dyeing_bills")
        .select("total_amount, paid_amount, bill_date")
        .eq("customer_id", customerId)
        .order("bill_date", { ascending: false });

      if (dyeingError) throw dyeingError;

      // Calculate totals
      const invoiceTotals = (invoices || []).reduce(
        (acc, inv) => ({
          billed: acc.billed + (inv.total_amount || 0),
          paid: acc.paid + (inv.paid_amount || 0)
        }),
        { billed: 0, paid: 0 }
      );

      const dyeingTotals = (dyeingBills || []).reduce(
        (acc, bill) => ({
          billed: acc.billed + (bill.total_amount || 0),
          paid: acc.paid + (bill.paid_amount || 0)
        }),
        { billed: 0, paid: 0 }
      );

      const totalBilled = invoiceTotals.billed + dyeingTotals.billed;
      const totalPaid = invoiceTotals.paid + dyeingTotals.paid;

      setCredit({
        totalBilled,
        totalPaid,
        pendingAmount: totalBilled - totalPaid,
        lastInvoiceDate: invoices?.[0]?.invoice_date || dyeingBills?.[0]?.bill_date || null
      });
    } catch (error) {
      console.error("Error fetching customer credit:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!customerId || loading) {
    return null;
  }

  if (!credit) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Customer Balance
          </h4>
          {credit.pendingAmount > 0 ? (
            <Badge variant="outline" className="text-warning border-warning text-xs">
              Due
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success border-success text-xs">
              Clear
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-sm font-bold text-foreground">
              ₹{credit.totalBilled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="text-center p-2 rounded-lg bg-background/50">
            <TrendingDown className="h-4 w-4 mx-auto text-success mb-1" />
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-sm font-bold text-success">
              ₹{credit.totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="text-center p-2 rounded-lg bg-background/50">
            <Clock className="h-4 w-4 mx-auto text-warning mb-1" />
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className={`text-sm font-bold ${credit.pendingAmount > 0 ? "text-warning" : "text-success"}`}>
              ₹{credit.pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {credit.lastInvoiceDate && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Last transaction: {new Date(credit.lastInvoiceDate).toLocaleDateString("en-IN")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerCreditCard;
