import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Share2, FileDown, BarChart3, IndianRupee, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const Reports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [customers, setCustomers] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchCompanyProfile();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name");
    
    if (data) {
      setCustomers(data);
    }
  };

  const fetchCompanyProfile = async () => {
    const { data } = await supabase
      .from("company_profile")
      .select("*")
      .maybeSingle();
    
    if (data) {
      setCompanyProfile(data);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("*, customers(name, gstin, phone, address)")
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate);

      if (selectedCustomer !== "all") {
        query = query.eq("customer_id", selectedCustomer);
      }

      const { data, error } = await query.order("invoice_date", { ascending: false });

      if (error) throw error;
      setReportData(data || []);
      toast.success("Report generated successfully");
    } catch (error: any) {
      toast.error("Failed to generate report");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Calculate totals
    const totalSubtotal = reportData.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
    const totalGST = reportData.reduce((sum, inv) => 
      sum + (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0), 0);
    const totalAmount = reportData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = reportData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalBalance = totalAmount - totalPaid;

    const worksheetData = [
      // Header row with company info
      [companyProfile?.company_name || "Company Report"],
      [`Report Period: ${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}`],
      [selectedCustomer !== "all" ? `Customer: ${customers.find(c => c.id === selectedCustomer)?.name || ""}` : "All Customers"],
      [],
      // Column headers
      ["Invoice #", "Date", "Customer", "Customer GSTIN", "Subtotal (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total GST (₹)", "Total Amount (₹)", "Paid (₹)", "Balance (₹)", "Status"],
      // Data rows
      ...reportData.map(inv => [
        inv.invoice_number,
        new Date(inv.invoice_date).toLocaleDateString("en-IN"),
        inv.customers?.name || "",
        inv.customers?.gstin || "",
        inv.subtotal || 0,
        inv.cgst_amount || 0,
        inv.sgst_amount || 0,
        inv.igst_amount || 0,
        (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0),
        inv.total_amount || 0,
        inv.paid_amount || 0,
        (inv.total_amount || 0) - (inv.paid_amount || 0),
        inv.status?.toUpperCase() || ""
      ]),
      [],
      // Summary row
      ["TOTAL", "", "", "", totalSubtotal, "", "", "", totalGST, totalAmount, totalPaid, totalBalance, ""]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 18 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `Sales_Report_${startDate}_to_${endDate}.xlsx`);
    toast.success("Report exported to Excel");
  };

  const handleWhatsAppShare = () => {
    if (reportData.length === 0) {
      toast.error("No data to share");
      return;
    }

    const totalAmount = reportData.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = reportData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalBalance = totalAmount - totalPaid;
    
    const message = `*Sales Report - ${companyProfile?.company_name || ""}*\n\n` +
      `📅 Period: ${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}\n\n` +
      `📊 *Summary*\n` +
      `Total Invoices: ${reportData.length}\n` +
      `Total Amount: ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      `Total Received: ₹${totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      `Outstanding: ₹${totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n\n` +
      `*Recent Invoices:*\n` +
      reportData.slice(0, 10).map(inv => 
        `📄 ${inv.invoice_number} - ${inv.customers?.name}\n   ₹${inv.total_amount.toLocaleString("en-IN")}`
      ).join("\n\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Calculate summary stats
  const totalAmount = reportData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = reportData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalBalance = totalAmount - totalPaid;

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleWhatsAppShare} disabled={reportData.length === 0} className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={reportData.length === 0} className="gap-2">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 px-3 md:px-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Statement
          </CardTitle>
          <CardDescription>Select date range and filter by customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">From Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">To Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full h-11">
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Show when data exists */}
      {reportData.length > 0 && (
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
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success" />
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
                    ₹{totalBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {reportData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 px-3 md:px-6">
            <CardTitle className="text-base md:text-lg">Report Results</CardTitle>
            <CardDescription>
              Showing {reportData.length} invoice(s) from {new Date(startDate).toLocaleDateString("en-IN")} to {new Date(endDate).toLocaleDateString("en-IN")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 md:px-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Customer</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                  <TableHead className="text-right whitespace-nowrap">GST</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Paid</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium whitespace-nowrap">{invoice.invoice_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.customers?.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">₹{(invoice.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      ₹{((invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">₹{(invoice.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-success">₹{(invoice.paid_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right whitespace-nowrap ${(invoice.total_amount - invoice.paid_amount) > 0 ? 'text-warning' : 'text-success'}`}>
                      ₹{((invoice.total_amount || 0) - (invoice.paid_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-success/10 text-success' 
                          : invoice.status === 'partial' 
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {invoice.status?.toUpperCase()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary Row */}
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right">₹{reportData.reduce((sum, inv) => sum + (inv.subtotal || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    ₹{reportData.reduce((sum, inv) => sum + (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-success">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-warning">₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
