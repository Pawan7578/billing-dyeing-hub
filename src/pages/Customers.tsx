import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search, Users, IndianRupee, MapPin, Phone, CreditCard } from "lucide-react";
import GSTInput from "@/components/GSTInput";
import PaymentModal from "@/components/PaymentModal";
import { GSTValidationResult } from "@/lib/gst-utils";

interface Customer {
  id: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  total_credit: number;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [gstValidation, setGstValidation] = useState<GSTValidationResult | null>(null);
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch customers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate actual outstanding for each customer
  const calculateCustomerOutstanding = async (customerId: string): Promise<number> => {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount")
      .eq("customer_id", customerId);

    const { data: dyeingBills } = await supabase
      .from("dyeing_bills")
      .select("total_amount, paid_amount")
      .eq("customer_id", customerId);

    const invoiceTotal = (invoices || []).reduce((sum, inv) => 
      sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
    
    const dyeingTotal = (dyeingBills || []).reduce((sum, bill) => 
      sum + (bill.total_amount || 0) - (bill.paid_amount || 0), 0);

    return invoiceTotal + dyeingTotal;
  };

  const handleGSTChange = (value: string, validation: GSTValidationResult) => {
    setFormData({ ...formData, gstin: value });
    setGstValidation(validation);
  };

  const handleStateDetected = (state: string) => {
    if (!formData.state) {
      setFormData(prev => ({ ...prev, state }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.gstin && gstValidation && !gstValidation.isValid) {
      toast.error("Please enter a valid GST number or leave it empty");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", editingCustomer.id);

        if (error) throw error;
        toast.success("Customer updated successfully");
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({ ...formData, created_by: user?.id });

        if (error) throw error;
        toast.success("Customer added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error: any) {
      toast.error("Failed to delete customer");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      gstin: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    });
    setEditingCustomer(null);
    setGstValidation(null);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      gstin: customer.gstin || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pincode: customer.pincode || "",
    });
    setDialogOpen(true);
  };

  const openPaymentModal = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    setPaymentModalOpen(true);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalCredit = customers.reduce((sum, c) => sum + (c.total_credit || 0), 0);
  const customersWithCredit = customers.filter(c => (c.total_credit || 0) > 0).length;

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer database</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 md:mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer information" : "Fill in the customer details"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company/Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter customer name"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <GSTInput
                    value={formData.gstin}
                    onChange={handleGSTChange}
                    onStateDetected={handleStateDetected}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">
                    State
                    {gstValidation?.isValid && gstValidation.stateName && (
                      <Badge variant="outline" className="ml-2 text-xs">Auto-detected</Badge>
                    )}
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="000000"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2 w-full sm:w-auto">
                  {loading ? "Saving..." : (editingCustomer ? "Update" : "Add")} Customer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Customers</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-lg md:text-xl font-bold text-warning">
                  ₹{totalCredit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Outstanding</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{customersWithCredit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 px-3 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base md:text-lg">All Customers</CardTitle>
              <CardDescription>{filteredCustomers.length} customer(s) found</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? "No customers match your search" : "No customers found. Add your first customer!"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </p>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${(customer.total_credit || 0) > 0 ? "text-warning" : "text-success"}`}>
                        ₹{(customer.total_credit || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {customer.gstin && (
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono block mb-2">
                        {customer.gstin}
                      </code>
                    )}
                    {(customer.city || customer.state) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[customer.city, customer.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {(customer.total_credit || 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentModal(customer)}
                          className="flex-1 gap-1 text-xs"
                        >
                          <CreditCard className="h-3 w-3" />
                          Receive Payment
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(customer)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold">GSTIN</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold text-right">Outstanding</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-secondary/30 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            {customer.email && (
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {customer.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.gstin ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {customer.gstin}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.city || customer.state ? (
                            <span className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {[customer.city, customer.state].filter(Boolean).join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${(customer.total_credit || 0) > 0 ? "text-warning" : "text-success"}`}>
                            ₹{(customer.total_credit || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(customer.total_credit || 0) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPaymentModal(customer)}
                                className="h-8 gap-1 text-xs"
                              >
                                <CreditCard className="h-3 w-3" />
                                Payment
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(customer)}
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {selectedCustomerForPayment && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          customerId={selectedCustomerForPayment.id}
          customerName={selectedCustomerForPayment.name}
          totalOutstanding={selectedCustomerForPayment.total_credit || 0}
          onPaymentRecorded={fetchCustomers}
        />
      )}
    </div>
  );
};

export default Customers;
