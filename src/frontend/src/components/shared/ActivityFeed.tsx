import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Calendar, 
  Users, 
  Edit, 
  Plus, 
  CheckCircle, 
  Clock,
  MessageSquare
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: 'sermon_created' | 'sermon_edited' | 'sermon_scheduled' | 'sermon_delivered' | 'series_created' | 'collaboration' | 'comment'
  user: {
    name: string
    avatar?: string
  }
  timestamp: Date
  title: string
  description?: string
  metadata?: {
    sermonTitle?: string
    seriesTitle?: string
    targetDate?: Date
  }
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sermon_created':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'sermon_edited':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'sermon_scheduled':
        return <Calendar className="h-4 w-4 text-purple-600" />
      case 'sermon_delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'series_created':
        return <FileText className="h-4 w-4 text-indigo-600" />
      case 'collaboration':
        return <Users className="h-4 w-4 text-orange-600" />
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'sermon_created':
      case 'sermon_delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'sermon_edited':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'sermon_scheduled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      case 'series_created':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
      case 'collaboration':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user.avatar} />
                  <AvatarFallback className="text-xs">
                    {activity.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getActivityIcon(activity.type)}
                    <span className="font-medium text-sm">{activity.user.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getActivityBadgeColor(activity.type)}`}
                    >
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-foreground mb-1">
                    {activity.title}
                  </p>
                  
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {activity.description}
                    </p>
                  )}
                  
                  {activity.metadata && (
                    <div className="text-xs text-muted-foreground">
                      {activity.metadata.sermonTitle && (
                        <span>Sermon: {activity.metadata.sermonTitle}</span>
                      )}
                      {activity.metadata.seriesTitle && (
                        <span>Series: {activity.metadata.seriesTitle}</span>
                      )}
                      {activity.metadata.targetDate && (
                        <span> • Scheduled for {activity.metadata.targetDate.toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
              
              {index < displayedActivities.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}