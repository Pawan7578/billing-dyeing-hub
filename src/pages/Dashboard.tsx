import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Palette, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalCustomers: number;
  totalInvoices: number;
  totalDyeingBills: number;
  pendingAmount: number;
  monthlyRevenue: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalInvoices: 0,
    totalDyeingBills: 0,
    pendingAmount: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [customersRes, invoicesRes, dyeingRes] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("total_amount, paid_amount, status"),
        supabase.from("dyeing_bills").select("*", { count: "exact", head: true }),
      ]);

      const totalCustomers = customersRes.count || 0;
      const totalInvoices = invoicesRes.data?.length || 0;
      const totalDyeingBills = dyeingRes.count || 0;

      const pendingAmount = invoicesRes.data?.reduce((sum, inv) => {
        return sum + (Number(inv.total_amount) - Number(inv.paid_amount));
      }, 0) || 0;

      const currentMonth = new Date().getMonth();
      const monthlyRevenue = invoicesRes.data?.reduce((sum, inv) => {
        if (inv.status === "paid") {
          return sum + Number(inv.paid_amount);
        }
        return sum;
      }, 0) || 0;

      setStats({
        totalCustomers,
        totalInvoices,
        totalDyeingBills,
        pendingAmount,
        monthlyRevenue,
      });
    } catch (error: any) {
      toast.error("Failed to fetch dashboard stats");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Invoices",
      value: stats.totalInvoices,
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Dyeing Bills",
      value: stats.totalDyeingBills,
      icon: Palette,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Pending Amount",
      value: `₹${stats.pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your billing system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate("/customers")}
            className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <Users className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Add Customer</h3>
            <p className="text-sm text-muted-foreground">Create new customer</p>
          </button>
          <button
            onClick={() => navigate("/invoices/new")}
            className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <FileText className="h-8 w-8 text-accent mb-2" />
            <h3 className="font-semibold">New Invoice</h3>
            <p className="text-sm text-muted-foreground">Generate invoice</p>
          </button>
          <button
            onClick={() => navigate("/dyeing/new")}
            className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <Palette className="h-8 w-8 text-warning mb-2" />
            <h3 className="font-semibold">Dyeing Bill</h3>
            <p className="text-sm text-muted-foreground">Create dyeing bill</p>
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <TrendingUp className="h-8 w-8 text-success mb-2" />
            <h3 className="font-semibold">View Reports</h3>
            <p className="text-sm text-muted-foreground">Analytics & insights</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
