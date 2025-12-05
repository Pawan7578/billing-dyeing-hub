import { Button } from "@/components/ui/button";
import { ExternalLink, Truck } from "lucide-react";

interface EWayBillButtonProps {
  amount: number;
  className?: string;
}

const EWayBillButton = ({ amount, className = "" }: EWayBillButtonProps) => {
  const EWAY_BILL_THRESHOLD = 50000;
  const EWAY_BILL_URL = "https://ewaybillgst.gov.in/Login.aspx";

  if (amount < EWAY_BILL_THRESHOLD) {
    return null;
  }

  const handleClick = () => {
    window.open(EWAY_BILL_URL, "_blank");
  };

  return (
    <Button 
      onClick={handleClick}
      className={`bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2 shadow-lg hover:shadow-xl transition-all ${className}`}
    >
      <Truck className="h-4 w-4" />
      Generate E-Way Bill
      <ExternalLink className="h-3.5 w-3.5" />
    </Button>
  );
};

export default EWayBillButton;
