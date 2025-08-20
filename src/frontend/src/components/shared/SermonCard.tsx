import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, User, FileText, Play } from "lucide-react"
import { format } from "date-fns"

interface SermonCardProps {
  sermon: {
    id: string
    title: string
    speaker: {
      name: string
      avatar?: string
    }
    date: Date
    duration?: number
    status: 'draft' | 'scheduled' | 'delivered'
    seriesTitle?: string
    description?: string
    tags?: string[]
  }
  onEdit?: () => void
  onPreview?: () => void
  onSchedule?: () => void
  compact?: boolean
}

export function SermonCard({ 
  sermon, 
  onEdit, 
  onPreview, 
  onSchedule, 
  compact = false 
}: SermonCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{sermon.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(sermon.date, 'MMM dd, yyyy')}
                <User className="h-3 w-3 ml-2" />
                {sermon.speaker.name}
              </div>
            </div>
            <Badge className={getStatusColor(sermon.status)}>
              {sermon.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{sermon.title}</CardTitle>
            {sermon.seriesTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                Part of: {sermon.seriesTitle}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(sermon.status)}>
            {sermon.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={sermon.speaker.avatar} />
              <AvatarFallback className="text-xs">
                {sermon.speaker.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{sermon.speaker.name}</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(sermon.date, 'MMM dd, yyyy')}
          </div>
          
          {sermon.duration && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {sermon.duration}min
            </div>
          )}
        </div>
        
        {sermon.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {sermon.description}
          </p>
        )}
        
        {sermon.tags && sermon.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {sermon.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {sermon.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{sermon.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <FileText className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        {onPreview && (
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Play className="h-3 w-3 mr-1" />
            Preview
          </Button>
        )}
        {onSchedule && sermon.status === 'draft' && (
          <Button size="sm" onClick={onSchedule}>
            Schedule
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}