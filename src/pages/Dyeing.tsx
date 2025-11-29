import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Dyeing = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dyeing Bills</h1>
          <p className="text-muted-foreground mt-1">Manage dyeing operations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Dyeing Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Dyeing Bills</CardTitle>
          <CardDescription>View and manage dyeing bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No dyeing bills found. Create your first one!
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dyeing;
