import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { IndianRupee, Calendar, CreditCard, Wallet } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  onPaymentRecorded: () => void;
}

const PaymentModal = ({ 
  open, 
  onOpenChange, 
  customerId, 
  customerName, 
  totalOutstanding,
  onPaymentRecorded 
}: PaymentModalProps) => {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (paymentAmount > totalOutstanding) {
      toast.error("Payment amount cannot exceed outstanding balance");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          customer_id: customerId,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: "cash",
          notes: notes || `Payment received from ${customerName}`,
          created_by: user.id,
        });

      if (paymentError) throw paymentError;

      // Update customer's total_credit (reduce by payment amount)
      const { data: customer } = await supabase
        .from("customers")
        .select("total_credit")
        .eq("id", customerId)
        .single();

      const newCredit = Math.max(0, (customer?.total_credit || 0) - paymentAmount);

      const { error: updateError } = await supabase
        .from("customers")
        .update({ total_credit: newCredit })
        .eq("id", customerId);

      if (updateError) throw updateError;

      toast.success(`Payment of ₹${paymentAmount.toLocaleString("en-IN")} recorded successfully!`);
      
      // Reset form
      setAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      
      onPaymentRecorded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment received from <span className="font-semibold">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Outstanding Summary */}
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-warning" />
              <span className="text-sm text-muted-foreground">Total Outstanding</span>
            </div>
            <span className="text-xl font-bold text-warning">
              ₹{totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Payment Date
            </Label>
            <Input
              id="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              Payment Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount received"
              className="h-11 text-lg"
              min="0"
              max={totalOutstanding}
              step="0.01"
              required
            />
            {parseFloat(amount) > totalOutstanding && (
              <p className="text-xs text-destructive">Amount exceeds outstanding balance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment reference or notes"
              className="h-11"
            />
          </div>

          {/* Preview */}
          {parseFloat(amount) > 0 && parseFloat(amount) <= totalOutstanding && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Current Outstanding:</span>
                <span>₹{totalOutstanding.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Payment Amount:</span>
                <span className="text-success">- ₹{parseFloat(amount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>New Balance:</span>
                <span className={totalOutstanding - parseFloat(amount) === 0 ? "text-success" : "text-warning"}>
                  ₹{(totalOutstanding - parseFloat(amount)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || parseFloat(amount) > totalOutstanding || !amount}
              className="gap-2"
            >
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
