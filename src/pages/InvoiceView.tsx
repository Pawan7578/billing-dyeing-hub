import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Printer, Share2, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  gst_type: string;
  subtotal: number;
  cgst_rate: number | null;
  cgst_amount: number | null;
  sgst_rate: number | null;
  sgst_amount: number | null;
  igst_rate: number | null;
  igst_amount: number | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  customers: {
    name: string;
    address: string | null;
    gstin: string | null;
    phone: string | null;
  } | null;
}

interface InvoiceItem {
  item_name: string;
  hsn_code: string;
  quantity: number;
  rate: number;
  amount: number;
}

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceData();
    fetchCompanyProfile();
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          customers (name, address, gstin, phone)
        `)
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to fetch invoice");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyProfile = async () => {
    const { data, error } = await supabase
      .from("company_profile")
      .select("*")
      .single();
    
    if (!error) {
      setCompanyProfile(data);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!invoice) return;

    const worksheetData = [
      ["Invoice Number", invoice.invoice_number],
      ["Date", new Date(invoice.invoice_date).toLocaleDateString("en-IN")],
      ["Customer", invoice.customers?.name || ""],
      ["GSTIN", invoice.customers?.gstin || ""],
      [],
      ["Item Name", "HSN Code", "Quantity", "Rate", "Amount"],
      ...items.map(item => [
        item.item_name,
        item.hsn_code,
        item.quantity,
        item.rate,
        item.amount
      ]),
      [],
      ["Subtotal", "", "", "", invoice.subtotal],
      ...(invoice.gst_type === "CGST_SGST" ? [
        [`CGST (${invoice.cgst_rate}%)`, "", "", "", invoice.cgst_amount],
        [`SGST (${invoice.sgst_rate}%)`, "", "", "", invoice.sgst_amount],
      ] : [
        [`IGST (${invoice.igst_rate}%)`, "", "", "", invoice.igst_amount],
      ]),
      ["Total Amount", "", "", "", invoice.total_amount],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, `${invoice.invoice_number}.xlsx`);
    toast.success("Invoice exported to Excel");
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;

    const message = `*Invoice: ${invoice.invoice_number}*\n\n` +
      `Customer: ${invoice.customers?.name}\n` +
      `Date: ${new Date(invoice.invoice_date).toLocaleDateString("en-IN")}\n\n` +
      `*Items:*\n` +
      items.map(item => 
        `${item.item_name} (HSN: ${item.hsn_code})\n` +
        `Qty: ${item.quantity} × ₹${item.rate} = ₹${item.amount}`
      ).join("\n\n") +
      `\n\n*Subtotal:* ₹${invoice.subtotal}\n` +
      (invoice.gst_type === "CGST_SGST" 
        ? `*CGST (${invoice.cgst_rate}%):* ₹${invoice.cgst_amount}\n*SGST (${invoice.sgst_rate}%):* ₹${invoice.sgst_amount}\n`
        : `*IGST (${invoice.igst_rate}%):* ₹${invoice.igst_amount}\n`
      ) +
      `*Total Amount:* ₹${invoice.total_amount}\n\n` +
      `${companyProfile?.company_name || ""}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.invoice_number}</h1>
            <p className="text-muted-foreground mt-1">View and print invoice</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleWhatsAppShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4" />
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card className="p-8 print:shadow-none print:border-0">
        {/* Company Header */}
        <div className="border-b-2 border-primary pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-primary">{companyProfile?.company_name || "Your Company"}</h2>
              <p className="text-sm text-muted-foreground mt-2">{companyProfile?.address}</p>
              <p className="text-sm text-muted-foreground">GSTIN: {companyProfile?.gstin}</p>
              <p className="text-sm text-muted-foreground">Phone: {companyProfile?.phone}</p>
            </div>
            {companyProfile?.logo_url && (
              <img src={companyProfile.logo_url} alt="Company Logo" className="h-20 w-20 object-contain" />
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.customers?.name}</p>
            <p className="text-sm text-muted-foreground">{invoice.customers?.address}</p>
            <p className="text-sm text-muted-foreground">GSTIN: {invoice.customers?.gstin}</p>
            <p className="text-sm text-muted-foreground">Phone: {invoice.customers?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><span className="font-semibold">Invoice No:</span> {invoice.invoice_number}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</p>
            <p className="text-sm"><span className="font-semibold">Status:</span> <span className="uppercase">{invoice.status}</span></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-2">Item Name</th>
                <th className="text-center py-2">HSN</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3">{item.item_name}</td>
                  <td className="text-center py-3">{item.hsn_code}</td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3">₹{item.rate.toFixed(2)}</td>
                  <td className="text-right py-3">₹{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between py-1">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.gst_type === "CGST_SGST" ? (
              <>
                <div className="flex justify-between py-1">
                  <span>CGST ({invoice.cgst_rate}%):</span>
                  <span>₹{invoice.cgst_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>SGST ({invoice.sgst_rate}%):</span>
                  <span>₹{invoice.sgst_amount?.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1">
                <span>IGST ({invoice.igst_rate}%):</span>
                <span>₹{invoice.igst_amount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-primary font-bold text-lg">
              <span>Total Amount:</span>
              <span>₹{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-semibold mb-2">Notes:</p>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">Thank you for your business!</p>
        </div>
      </Card>
    </div>
  );
};

export default InvoiceView;
