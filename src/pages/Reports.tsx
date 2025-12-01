import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Share2, FileDown } from "lucide-react";
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
      .single();
    
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
        .select("*, customers(name)")
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

    const worksheetData = [
      ["Invoice Number", "Date", "Customer", "Subtotal", "GST", "Total", "Status"],
      ...reportData.map(inv => [
        inv.invoice_number,
        new Date(inv.invoice_date).toLocaleDateString("en-IN"),
        inv.customers?.name || "",
        inv.subtotal,
        (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0),
        inv.total_amount,
        inv.status.toUpperCase()
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Report_${startDate}_to_${endDate}.xlsx`);
    toast.success("Report exported to Excel");
  };

  const handleWhatsAppShare = () => {
    if (reportData.length === 0) {
      toast.error("No data to share");
      return;
    }

    const totalAmount = reportData.reduce((sum, inv) => sum + inv.total_amount, 0);
    const message = `*Sales Report - ${companyProfile?.company_name || ""}*\n\n` +
      `Period: ${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}\n\n` +
      `Total Invoices: ${reportData.length}\n` +
      `Total Amount: ₹${totalAmount.toFixed(2)}\n\n` +
      reportData.slice(0, 10).map(inv => 
        `📄 ${inv.invoice_number} - ${inv.customers?.name}\n` +
        `Amount: ₹${inv.total_amount}\n`
      ).join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleWhatsAppShare} disabled={reportData.length === 0}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={reportData.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Statement</CardTitle>
          <CardDescription>Select date range and filter by customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">From Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">To Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
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
          </div>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
            <CardDescription>
              Showing {reportData.length} invoice(s) from {new Date(startDate).toLocaleDateString("en-IN")} to {new Date(endDate).toLocaleDateString("en-IN")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{invoice.customers?.name}</TableCell>
                    <TableCell className="text-right">₹{invoice.subtotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      ₹{((invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">₹{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell className="uppercase">{invoice.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default Reports;
