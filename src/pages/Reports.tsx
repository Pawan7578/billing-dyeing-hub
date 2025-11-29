import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Analytics and insights</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
            <CardDescription>Monthly sales overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Sales data will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Report</CardTitle>
            <CardDescription>Pending payments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Outstanding data will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Report</CardTitle>
            <CardDescription>Top customers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Customer analytics will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dyeing Revenue</CardTitle>
            <CardDescription>Revenue from dyeing operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Dyeing revenue data will appear here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
