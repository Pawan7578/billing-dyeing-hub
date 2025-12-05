import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Eye, Share2, Download, Search, FileText, Calendar, User, IndianRupee, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import CompanyBranding from "@/components/CompanyBranding";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  customer_id: string;
  customers: { name: string } | null;
}

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    const { data } = await supabase
      .from("company_profile")
      .select("*")
      .maybeSingle();
    
    if (data) {
      setCompanyProfile(data);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_amount,
          paid_amount,
          status,
          customer_id,
          customers (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch invoices");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    
    setDeleting(true);
    try {
      // First delete invoice items
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoiceToDelete.id);

      if (itemsError) throw itemsError;

      // Then delete the invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceToDelete.id);

      if (invoiceError) throw invoiceError;

      // Update customer's total_credit
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount")
        .eq("customer_id", invoiceToDelete.customer_id);

      const { data: dyeingBills } = await supabase
        .from("dyeing_bills")
        .select("total_amount, paid_amount")
        .eq("customer_id", invoiceToDelete.customer_id);

      const invoiceTotal = (invoices || []).reduce((sum, inv) => 
        sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
      
      const dyeingTotal = (dyeingBills || []).reduce((sum, bill) => 
        sum + (bill.total_amount || 0) - (bill.paid_amount || 0), 0);

      await supabase
        .from("customers")
        .update({ total_credit: invoiceTotal + dyeingTotal })
        .eq("id", invoiceToDelete.customer_id);

      toast.success(`Invoice ${invoiceToDelete.invoice_number} deleted successfully`);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    const worksheetData = [
      ["Invoice Number", "Date", "Customer", "Amount", "Paid", "Balance", "Status"],
      ...invoices.map(inv => [
        inv.invoice_number,
        new Date(inv.invoice_date).toLocaleDateString("en-IN"),
        inv.customers?.name || "",
        inv.total_amount,
        inv.paid_amount,
        inv.total_amount - inv.paid_amount,
        inv.status.toUpperCase()
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, `Invoices_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`);
    toast.success("Invoices exported to Excel");
  };

  const handleWhatsAppShare = () => {
    const message = `*Invoice List - ${companyProfile?.company_name || ""}*\n\n` +
      invoices.slice(0, 10).map(inv => 
        `📄 ${inv.invoice_number}\n` +
        `Customer: ${inv.customers?.name}\n` +
        `Amount: ₹${inv.total_amount.toLocaleString("en-IN")}\n` +
        `Status: ${inv.status.toUpperCase()}\n`
      ).join("\n") +
      `\nTotal Invoices: ${invoices.length}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">Paid</Badge>;
      case "partial":
        return <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">Partial</Badge>;
      default:
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Pending</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary stats
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const totalPending = totalAmount - totalPaid;

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-0">
      {/* Header with Company Branding */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your sales invoices</p>
        </div>
        
        {companyProfile && (
          <div className="lg:max-w-sm hidden lg:block">
            <CompanyBranding company={companyProfile} size="sm" showDetails={false} />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="text-lg md:text-xl font-bold text-foreground">
                  ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-success/10 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Received</p>
                <p className="text-lg md:text-xl font-bold text-success">
                  ₹{totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
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
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg md:text-xl font-bold text-warning">
                  ₹{totalPending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 flex-1 sm:flex-none">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" onClick={handleWhatsAppShare} className="gap-2 flex-1 sm:flex-none">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button onClick={() => navigate("/invoices/new")} className="gap-2 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Invoices List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 px-3 md:px-6">
          <CardTitle className="text-base md:text-lg">All Invoices</CardTitle>
          <CardDescription>{filteredInvoices.length} invoice(s) found</CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? "No invoices match your search" : "No invoices found. Create your first invoice!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border rounded-xl bg-card hover:bg-secondary/30 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                        {invoice.invoice_number}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 md:gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        {invoice.customers?.name || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        {new Date(invoice.invoice_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 lg:gap-6">
                    <div className="text-right">
                      <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
                      <p className="text-base md:text-lg font-bold text-foreground">
                        ₹{invoice.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[10px] md:text-xs text-muted-foreground">Balance</p>
                      <p className={`text-base md:text-lg font-bold ${
                        invoice.total_amount - invoice.paid_amount > 0 ? "text-warning" : "text-success"
                      }`}>
                        ₹{(invoice.total_amount - invoice.paid_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invoices/${invoice.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteClick(invoice, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${invoiceToDelete?.invoice_number}"? This will also update the customer's outstanding balance. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
};

export default Invoices;
