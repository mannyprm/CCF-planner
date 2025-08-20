import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Users, BookOpen, Plus, Edit, Archive } from "lucide-react"
import { format } from "date-fns"

interface SeriesCardProps {
  series: {
    id: string
    title: string
    description?: string
    status: 'planning' | 'active' | 'completed'
    startDate: Date
    endDate?: Date
    totalSermons: number
    completedSermons: number
    speakers: string[]
    theme?: string
    color?: string
  }
  onEdit?: () => void
  onAddSermon?: () => void
  onArchive?: () => void
  onViewDetails?: () => void
}

export function SeriesCard({ 
  series, 
  onEdit, 
  onAddSermon, 
  onArchive, 
  onViewDetails 
}: SeriesCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const progress = series.totalSermons > 0 
    ? (series.completedSermons / series.totalSermons) * 100 
    : 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg cursor-pointer hover:text-primary" onClick={onViewDetails}>
              {series.title}
            </CardTitle>
            {series.theme && (
              <p className="text-sm text-muted-foreground mt-1">
                Theme: {series.theme}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(series.status)}>
            {series.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {series.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {series.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(series.startDate, 'MMM dd, yyyy')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{series.completedSermons}/{series.totalSermons} sermons</span>
          </div>
          
          {series.endDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Ends: {format(series.endDate, 'MMM dd')}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{series.speakers.length} speaker{series.speakers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {series.totalSermons > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {series.speakers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Speakers:</p>
            <div className="flex flex-wrap gap-1">
              {series.speakers.slice(0, 3).map((speaker, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {speaker}
                </Badge>
              ))}
              {series.speakers.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{series.speakers.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        {onAddSermon && series.status !== 'completed' && (
          <Button variant="outline" size="sm" onClick={onAddSermon}>
            <Plus className="h-3 w-3 mr-1" />
            Add Sermon
          </Button>
        )}
        {onArchive && series.status === 'completed' && (
          <Button variant="outline" size="sm" onClick={onArchive}>
            <Archive className="h-3 w-3 mr-1" />
            Archive
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}