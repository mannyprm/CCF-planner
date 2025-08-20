import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and metrics for your sermon planning and delivery
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Analytics dashboard coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}