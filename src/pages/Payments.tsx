import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Payments = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Track all payment transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View all payment records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No payments recorded yet
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
