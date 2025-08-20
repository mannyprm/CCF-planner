import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

interface StatisticsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon: LucideIcon
  description?: string
}

export function StatisticsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description 
}: StatisticsCardProps) {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'decrease':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'neutral':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change && (
          <div className="flex items-center mt-2">
            <Badge 
              variant="secondary" 
              className={getChangeColor(change.type)}
            >
              {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
              {Math.abs(change.value)}%
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              {change.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}