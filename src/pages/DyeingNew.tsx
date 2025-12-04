import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import CompanyBranding from "@/components/CompanyBranding";
import CustomerCreditCard from "@/components/CustomerCreditCard";

interface DyeingItem {
  id: string;
  product_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Customer {
  id: string;
  name: string;
}

const DyeingNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  
  const [customerId, setCustomerId] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<DyeingItem[]>([
    { id: crypto.randomUUID(), product_name: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchCompanyProfile();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    
    if (error) {
      toast.error("Failed to fetch customers");
      return;
    }
    setCustomers(data || []);
  };

  const fetchCompanyProfile = async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
      .maybeSingle();
    
    if (error) {
      console.error("Failed to fetch company profile:", error);
      return;
    }
    if (data) {
      setCompanyProfile(data);
    }
  };

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      product_name: "", 
      quantity: 1, 
      rate: 0, 
      amount: 0 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof DyeingItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const generateBillNumber = async () => {
    const prefix = companyProfile?.dyeing_prefix || "DYE";
    const { data, error } = await supabase
      .from("dyeing_bills")
      .select("bill_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last bill:", error);
      return `${prefix}-00001`;
    }

    if (!data || data.length === 0) {
      return `${prefix}-00001`;
    }

    const lastNumber = data[0].bill_number.split("-")[1];
    const nextNumber = (parseInt(lastNumber) + 1).toString().padStart(5, "0");
    return `${prefix}-${nextNumber}`;
  };

  const updateCustomerCredit = async (customerId: string) => {
    // Fetch all invoices for this customer
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount")
      .eq("customer_id", customerId);

    // Fetch all dyeing bills for this customer (already includes the newly inserted bill)
    const { data: dyeingBills } = await supabase
      .from("dyeing_bills")
      .select("total_amount, paid_amount")
      .eq("customer_id", customerId);

    // Calculate totals from all bills
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

    // Calculate customer-wise totals (new bill is already in dyeingBills from DB)
    const totalBilled = invoiceTotals.billed + dyeingTotals.billed;
    const totalPaid = invoiceTotals.paid + dyeingTotals.paid;
    const pendingAmount = totalBilled - totalPaid;

    // Update customer's total_credit
    await supabase
      .from("customers")
      .update({ total_credit: pendingAmount })
      .eq("id", customerId);

    return { totalBilled, totalPaid, pendingAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.some(item => !item.product_name)) {
      toast.error("Please fill in all item details");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const billNumber = await generateBillNumber();
      const totalAmount = calculateTotal();

      const billData = {
        bill_number: billNumber,
        customer_id: customerId,
        bill_date: billDate,
        total_amount: totalAmount,
        status: "pending",
        notes,
        created_by: user.id,
      };

      const { data: bill, error: billError } = await supabase
        .from("dyeing_bills")
        .insert(billData)
        .select()
        .single();

      if (billError) throw billError;

      const itemsData = items.map(item => ({
        bill_id: bill.id,
        product_name: item.product_name,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("dyeing_bill_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      // Update customer credit after bill creation
      await updateCustomerCredit(customerId);

      toast.success(`Dyeing Bill ${billNumber} created successfully!`);
      navigate("/dyeing");
    } catch (error: any) {
      console.error("Error creating dyeing bill:", error);
      toast.error("Failed to create dyeing bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dyeing")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Dyeing Bill</h1>
          <p className="text-muted-foreground mt-1">Create a new dyeing bill</p>
        </div>
      </div>

      {/* Company Branding */}
      {companyProfile && (
        <Card className="bg-gradient-to-r from-primary/5 via-background to-accent/5">
          <CardContent className="p-4">
            <CompanyBranding company={companyProfile} size="md" showDetails={true} />
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill_date">Bill Date</Label>
                <Input
                  id="bill_date"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
            </div>

            {/* Customer Credit Card */}
            {customerId && (
              <CustomerCreditCard customerId={customerId} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                  <div className="col-span-12 md:col-span-4 space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={item.product_name}
                      onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                      placeholder="Product name"
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-3 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-span-5 md:col-span-2 space-y-2">
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-span-11 md:col-span-2 space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="text"
                      value={item.amount.toFixed(2)}
                      disabled
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full md:w-80 space-y-2 border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/dyeing")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Dyeing Bill"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DyeingNew;
