import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, FileText, Package, Calculator, StickyNote } from "lucide-react";
import CompanyBranding from "@/components/CompanyBranding";
import CustomerCreditCard from "@/components/CustomerCreditCard";

interface InvoiceItem {
  id: string;
  item_name: string;
  hsn_code: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Customer {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
  phone: string | null;
  address: string | null;
}

const InvoiceNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [gstType, setGstType] = useState<"CGST_SGST" | "IGST">("CGST_SGST");
  const [gstRate, setGstRate] = useState(18);
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), item_name: "", hsn_code: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchCompanyProfile();
  }, []);

  useEffect(() => {
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [customerId, customers]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, gstin, state, phone, address")
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
      item_name: "", 
      hsn_code: "", 
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateGST = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * gstRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generateInvoiceNumber = async () => {
    const prefix = companyProfile?.invoice_prefix || "INV";
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last invoice:", error);
      return `${prefix}-00001`;
    }

    if (!data || data.length === 0) {
      return `${prefix}-00001`;
    }

    const lastNumber = data[0].invoice_number.split("-")[1];
    const nextNumber = (parseInt(lastNumber) + 1).toString().padStart(5, "0");
    return `${prefix}-${nextNumber}`;
  };

  const updateCustomerCredit = async () => {
    if (!customerId) return;

    // Fetch all invoices for this customer (includes the newly inserted invoice)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount")
      .eq("customer_id", customerId);

    // Fetch all dyeing bills for this customer
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

    // Calculate customer-wise totals
    const totalBilled = invoiceTotals.billed + dyeingTotals.billed;
    const totalPaid = invoiceTotals.paid + dyeingTotals.paid;
    const pendingAmount = totalBilled - totalPaid;

    // Update customer's total_credit with the pending amount
    const { error: updateError } = await supabase
      .from("customers")
      .update({ total_credit: pendingAmount })
      .eq("id", customerId);

    if (updateError) {
      console.error("Error updating customer credit:", updateError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.some(item => !item.item_name || !item.hsn_code)) {
      toast.error("Please fill in all item details including HSN codes");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invoiceNumber = await generateInvoiceNumber();
      const subtotal = calculateSubtotal();
      const gstAmount = calculateGST();
      const totalAmount = calculateTotal();

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: customerId,
        invoice_date: invoiceDate,
        gst_type: gstType,
        subtotal,
        total_amount: totalAmount,
        status: "pending",
        notes,
        created_by: user.id,
        ...(gstType === "CGST_SGST" ? {
          cgst_rate: gstRate / 2,
          cgst_amount: gstAmount / 2,
          sgst_rate: gstRate / 2,
          sgst_amount: gstAmount / 2,
          igst_rate: null,
          igst_amount: null,
        } : {
          igst_rate: gstRate,
          igst_amount: gstAmount,
          cgst_rate: null,
          cgst_amount: null,
          sgst_rate: null,
          sgst_amount: null,
        })
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsData = items.map(item => ({
        invoice_id: invoice.id,
        item_name: item.item_name,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      // Update customer credit
      await updateCustomerCredit();

      toast.success(`Invoice ${invoiceNumber} created successfully!`);
      navigate("/invoices");
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Company Branding */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              New Invoice
            </h1>
            <p className="text-muted-foreground mt-1">Create a new GST invoice</p>
          </div>
        </div>
        
        {companyProfile && (
          <div className="lg:max-w-sm">
            <CompanyBranding company={companyProfile} size="sm" />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details & Customer Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer" className="text-sm font-medium">Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <span className="font-medium">{customer.name}</span>
                          {customer.gstin && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({customer.gstin})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_date" className="text-sm font-medium">Invoice Date</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_type" className="text-sm font-medium">GST Type</Label>
                  <Select value={gstType} onValueChange={(val: any) => setGstType(val)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">
                        <span className="font-medium">Intrastate</span>
                        <span className="text-xs text-muted-foreground ml-1">(CGST + SGST)</span>
                      </SelectItem>
                      <SelectItem value="IGST">
                        <span className="font-medium">Interstate</span>
                        <span className="text-xs text-muted-foreground ml-1">(IGST)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_rate" className="text-sm font-medium">GST Rate (%)</Label>
                  <Select value={gstRate.toString()} onValueChange={(val) => setGstRate(parseFloat(val))}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Customer Details */}
              {selectedCustomer && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Bill To:</h4>
                  <p className="font-medium text-foreground">{selectedCustomer.name}</p>
                  {selectedCustomer.address && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {selectedCustomer.phone && (
                      <p className="text-sm text-muted-foreground">📞 {selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.gstin && (
                      <p className="text-sm font-mono text-primary">GSTIN: {selectedCustomer.gstin}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Credit Card */}
          <div className="space-y-4">
            {customerId && (
              <CustomerCreditCard customerId={customerId} />
            )}
          </div>
        </div>

        {/* Items Section */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Items
            </CardTitle>
            <Button type="button" onClick={addItem} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header Row - Desktop */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Item Name</div>
                <div className="col-span-2">HSN Code</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-center">Rate (₹)</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="grid grid-cols-12 gap-2 items-center p-4 border rounded-lg bg-card hover:bg-secondary/20 transition-colors"
                >
                  <div className="col-span-12 md:col-span-3">
                    <Label className="md:hidden text-xs text-muted-foreground mb-1 block">Item Name *</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, "item_name", e.target.value)}
                      placeholder="Enter item name"
                      className="h-10"
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-2">
                    <Label className="md:hidden text-xs text-muted-foreground mb-1 block">HSN Code *</Label>
                    <Input
                      value={item.hsn_code}
                      onChange={(e) => updateItem(item.id, "hsn_code", e.target.value)}
                      placeholder="HSN"
                      className="h-10 font-mono"
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-2">
                    <Label className="md:hidden text-xs text-muted-foreground mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="h-10 text-center"
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-2">
                    <Label className="md:hidden text-xs text-muted-foreground mb-1 block">Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="h-10 text-center"
                    />
                  </div>
                  
                  <div className="col-span-5 md:col-span-2">
                    <Label className="md:hidden text-xs text-muted-foreground mb-1 block">Amount (₹)</Label>
                    <Input
                      type="text"
                      value={`₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      disabled
                      className="h-10 text-right font-semibold bg-muted/50"
                    />
                  </div>
                  
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <Separator className="my-6" />
            
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    ₹{calculateSubtotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {gstType === "CGST_SGST" ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">CGST ({gstRate / 2}%)</span>
                      <span className="font-medium text-foreground">
                        ₹{(calculateGST() / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">SGST ({gstRate / 2}%)</span>
                      <span className="font-medium text-foreground">
                        ₹{(calculateGST() / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">IGST ({gstRate}%)</span>
                    <span className="font-medium text-foreground">
                      ₹{calculateGST().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Total
                  </span>
                  <span className="text-xl font-bold text-primary">
                    ₹{calculateTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes, terms & conditions..."
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/invoices")}
            className="h-11 px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="h-11 px-8 gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Create Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceNew;
