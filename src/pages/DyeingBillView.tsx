import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Printer, Share2, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface DyeingBillData {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number | null;
  status: string;
  notes: string | null;
  customers: {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
}

interface DyeingBillItem {
  product_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

const DyeingBillView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<DyeingBillData | null>(null);
  const [items, setItems] = useState<DyeingBillItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillData();
    fetchCompanyProfile();
  }, [id]);

  const fetchBillData = async () => {
    try {
      const { data: billData, error: billError } = await supabase
        .from("dyeing_bills")
        .select(`
          *,
          customers (name, address, phone)
        `)
        .eq("id", id)
        .single();

      if (billError) throw billError;
      setBill(billData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("dyeing_bill_items")
        .select("*")
        .eq("bill_id", id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error: any) {
      console.error("Error fetching dyeing bill:", error);
      toast.error("Failed to fetch dyeing bill");
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
    if (!bill) return;

    const worksheetData = [
      ["Bill Number", bill.bill_number],
      ["Date", new Date(bill.bill_date).toLocaleDateString("en-IN")],
      ["Customer", bill.customers?.name || ""],
      [],
      ["Product Name", "Quantity", "Rate", "Amount"],
      ...items.map(item => [
        item.product_name,
        item.quantity,
        item.rate,
        item.amount
      ]),
      [],
      ["Total Amount", "", "", bill.total_amount],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dyeing Bill");
    XLSX.writeFile(workbook, `${bill.bill_number}.xlsx`);
    toast.success("Dyeing bill exported to Excel");
  };

  const handleWhatsAppShare = () => {
    if (!bill) return;

    const message = `*Dyeing Bill: ${bill.bill_number}*\n\n` +
      `Customer: ${bill.customers?.name}\n` +
      `Date: ${new Date(bill.bill_date).toLocaleDateString("en-IN")}\n\n` +
      `*Items:*\n` +
      items.map(item => 
        `${item.product_name}\n` +
        `Qty: ${item.quantity} × ₹${item.rate} = ₹${item.amount}`
      ).join("\n\n") +
      `\n\n*Total Amount:* ₹${bill.total_amount}\n\n` +
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

  if (!bill) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Dyeing bill not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dyeing")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Dyeing Bill {bill.bill_number}</h1>
            <p className="text-muted-foreground mt-1">View and print dyeing bill</p>
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

        {/* Bill Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Bill To:</h3>
            <p className="font-medium">{bill.customers?.name}</p>
            <p className="text-sm text-muted-foreground">{bill.customers?.address}</p>
            <p className="text-sm text-muted-foreground">Phone: {bill.customers?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm"><span className="font-semibold">Bill No:</span> {bill.bill_number}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(bill.bill_date).toLocaleDateString("en-IN")}</p>
            <p className="text-sm"><span className="font-semibold">Status:</span> <span className="uppercase">{bill.status}</span></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-2">Product Name</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3">{item.product_name}</td>
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
            <div className="flex justify-between py-2 border-t-2 border-primary font-bold text-lg">
              <span>Total Amount:</span>
              <span>₹{bill.total_amount.toFixed(2)}</span>
            </div>
            {bill.paid_amount !== null && bill.paid_amount > 0 && (
              <div className="flex justify-between py-1 text-success">
                <span>Paid Amount:</span>
                <span>₹{bill.paid_amount.toFixed(2)}</span>
              </div>
            )}
            {bill.paid_amount !== null && bill.paid_amount < bill.total_amount && (
              <div className="flex justify-between py-1 text-destructive">
                <span>Balance Due:</span>
                <span>₹{(bill.total_amount - (bill.paid_amount || 0)).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {bill.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-semibold mb-2">Notes:</p>
            <p className="text-sm text-muted-foreground">{bill.notes}</p>
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

export default DyeingBillView;
