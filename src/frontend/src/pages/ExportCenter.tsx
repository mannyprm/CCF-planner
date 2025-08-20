import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ExportCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Center</h1>
        <p className="text-muted-foreground">
          Export your sermon data in various formats
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Export functionality coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}