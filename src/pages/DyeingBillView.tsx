import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Printer, Share2, FileDown, Building2 } from "lucide-react";
import EWayBillButton from "@/components/EWayBillButton";
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
    state: string | null;
    city: string | null;
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
          customers (name, address, phone, state, city)
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
      .maybeSingle();
    
    if (!error && data) {
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

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    const integerPart = Math.floor(num);
    let result = '';
    
    if (integerPart >= 10000000) {
      result += convertLessThanThousand(Math.floor(integerPart / 10000000)) + ' Crore ';
    }
    if (integerPart >= 100000) {
      result += convertLessThanThousand(Math.floor((integerPart % 10000000) / 100000)) + ' Lakh ';
    }
    if (integerPart >= 1000) {
      result += convertLessThanThousand(Math.floor((integerPart % 100000) / 1000)) + ' Thousand ';
    }
    if (integerPart % 1000) {
      result += convertLessThanThousand(integerPart % 1000);
    }
    
    return result.trim() + ' Rupees Only';
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

  const balanceDue = bill.total_amount - (bill.paid_amount || 0);

  return (
    <div className="space-y-6">
      {/* Action Bar - Hidden on Print */}
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
        <div className="flex flex-wrap gap-2 items-center">
          <EWayBillButton amount={bill.total_amount} />
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

      {/* Print-Ready Bill Layout */}
      <div className="bg-background border rounded-lg shadow-sm print:shadow-none print:border-0 print:rounded-none">
        <div className="p-8 print:p-6 max-w-[210mm] mx-auto">
          
          {/* Header with Logo on Left */}
          <div className="flex items-start gap-6 pb-6 border-b-2 border-primary mb-6">
            {/* Circular Logo Container */}
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-lg">
                {companyProfile?.logo_url ? (
                  <img 
                    src={companyProfile.logo_url} 
                    alt={companyProfile?.company_name || "Company Logo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary mb-1">
                {companyProfile?.company_name || "Your Company Name"}
              </h1>
              {companyProfile?.address && (
                <p className="text-sm text-muted-foreground">{companyProfile.address}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {companyProfile?.phone && <span>Phone: {companyProfile.phone}</span>}
                {companyProfile?.email && <span>Email: {companyProfile.email}</span>}
              </div>
              {companyProfile?.gstin && (
                <p className="text-sm font-semibold text-primary mt-1">GSTIN: {companyProfile.gstin}</p>
              )}
            </div>

            {/* Bill Title */}
            <div className="text-right">
              <h2 className="text-3xl font-bold text-primary tracking-wide">DYEING BILL</h2>
              <p className="text-lg font-semibold mt-2">{bill.bill_number}</p>
              <p className="text-sm text-muted-foreground">
                Date: {new Date(bill.bill_date).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          {/* Bill To & Details Section */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Bill To</h3>
              <p className="font-semibold text-lg">{bill.customers?.name}</p>
              {bill.customers?.address && (
                <p className="text-sm text-muted-foreground mt-1">{bill.customers.address}</p>
              )}
              {(bill.customers?.city || bill.customers?.state) && (
                <p className="text-sm text-muted-foreground">
                  {[bill.customers?.city, bill.customers?.state].filter(Boolean).join(", ")}
                </p>
              )}
              {bill.customers?.phone && (
                <p className="text-sm text-muted-foreground mt-1">Phone: {bill.customers.phone}</p>
              )}
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Bill Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill No:</span>
                  <span className="font-medium">{bill.bill_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill Date:</span>
                  <span className="font-medium">{new Date(bill.bill_date).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium uppercase ${bill.status === 'paid' ? 'text-success' : 'text-warning'}`}>
                    {bill.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="py-3 px-4 text-left font-semibold">S.No</th>
                  <th className="py-3 px-4 text-left font-semibold">Product Description</th>
                  <th className="py-3 px-4 text-right font-semibold">Qty</th>
                  <th className="py-3 px-4 text-right font-semibold">Rate (₹)</th>
                  <th className="py-3 px-4 text-right font-semibold">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/20">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.product_name}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-medium">{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-80 border rounded-lg overflow-hidden">
              <div className="flex justify-between py-3 px-4 bg-primary text-primary-foreground font-bold text-lg">
                <span>Total Amount:</span>
                <span>₹{bill.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {bill.paid_amount !== null && bill.paid_amount > 0 && (
                <div className="flex justify-between py-2 px-4 border-t text-success">
                  <span>Paid Amount:</span>
                  <span>₹{bill.paid_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className="flex justify-between py-2 px-4 border-t bg-destructive/10 text-destructive font-semibold">
                  <span>Balance Due:</span>
                  <span>₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-muted/30 p-3 rounded-lg mb-6">
            <p className="text-sm">
              <span className="font-semibold">Amount in Words: </span>
              <span className="italic">{numberToWords(bill.total_amount)}</span>
            </p>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mb-6 p-4 border rounded-lg">
              <p className="text-sm font-semibold mb-1">Notes / Remarks:</p>
              <p className="text-sm text-muted-foreground">{bill.notes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="mb-8 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Terms & Conditions:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Goods once processed will not be taken back.</li>
              <li>All disputes subject to local jurisdiction only.</li>
              <li>E. & O.E. (Errors and Omissions Excepted)</li>
            </ol>
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            <div>
              <p className="text-sm font-semibold mb-16">Customer Signature</p>
              <div className="border-t border-dashed pt-2">
                <p className="text-xs text-muted-foreground">Authorized Signatory</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold mb-2">For {companyProfile?.company_name || "Company"}</p>
              <div className="h-14"></div>
              <div className="border-t border-dashed pt-2 inline-block min-w-[200px]">
                <p className="text-xs text-muted-foreground">Authorized Signatory</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">Thank you for your business!</p>
            <p className="text-xs text-muted-foreground mt-1">This is a computer generated bill.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DyeingBillView;