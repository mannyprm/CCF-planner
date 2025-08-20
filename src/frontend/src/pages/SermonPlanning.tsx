import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Calendar, 
  Plus, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit,
  Trash2,
  Users,
  Clock
} from "lucide-react"
import { format, startOfYear, endOfYear, eachWeekOfInterval, addWeeks, subWeeks, isSameWeek } from "date-fns"

// Mock data for sermon planning
const mockSermons = [
  {
    id: '1',
    title: 'New Year, New Heart',
    speaker: 'Pastor John',
    date: new Date(2024, 0, 7), // January 7, 2024
    seriesTitle: 'Fresh Start',
    seriesColor: '#3B82F6',
    status: 'scheduled',
    duration: 35
  },
  {
    id: '2',
    title: 'Walking in Faith',
    speaker: 'Sarah Wilson',
    date: new Date(2024, 0, 14), // January 14, 2024
    seriesTitle: 'Fresh Start',
    seriesColor: '#3B82F6',
    status: 'draft',
    duration: 30
  },
  {
    id: '3',
    title: 'The Heart of Worship',
    speaker: 'Mike Johnson',
    date: new Date(2024, 1, 4), // February 4, 2024
    seriesTitle: 'Foundations of Faith',
    seriesColor: '#10B981',
    status: 'scheduled',
    duration: 40
  }
]

const mockSeries = [
  { id: '1', title: 'Fresh Start', color: '#3B82F6', count: 4 },
  { id: '2', title: 'Foundations of Faith', color: '#10B981', count: 6 },
  { id: '3', title: 'Grace Abounds', color: '#F59E0B', count: 8 },
  { id: '4', title: 'Living Hope', color: '#8B5CF6', count: 5 }
]

export function SermonPlanning() {
  const [currentYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  const [isAddingSermon, setIsAddingSermon] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSeries, setFilterSeries] = useState("all")
  const [draggedSermon, setDraggedSermon] = useState<any>(null)

  // Generate all weeks of the current year
  const yearStart = startOfYear(new Date(currentYear, 0, 1))
  const yearEnd = endOfYear(new Date(currentYear, 0, 1))
  const weeks = eachWeekOfInterval({ start: yearStart, end: yearEnd })

  // Filter sermons based on search and series filter
  const filteredSermons = mockSermons.filter(sermon => {
    const matchesSearch = sermon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sermon.speaker.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeries = filterSeries === "all" || sermon.seriesTitle === filterSeries
    return matchesSearch && matchesSeries
  })

  // Get sermon for a specific week
  const getSermonForWeek = useCallback((weekStart: Date) => {
    return filteredSermons.find(sermon => isSameWeek(sermon.date, weekStart))
  }, [filteredSermons])

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, sermon: any) => {
    setDraggedSermon(sermon)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, weekStart: Date) => {
    e.preventDefault()
    if (draggedSermon) {
      // Update sermon date logic would go here
      console.log(`Moving sermon "${draggedSermon.title}" to week of ${format(weekStart, 'MMM dd, yyyy')}`)
      setDraggedSermon(null)
    }
  }

  const WeekCard = ({ weekStart, sermon }: { weekStart: Date; sermon?: any }) => {
    const weekNumber = Math.ceil((weekStart.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

    return (
      <Card 
        className={`h-24 cursor-pointer transition-all hover:shadow-md ${
          sermon ? 'border-l-4' : 'border-dashed border-gray-300'
        }`}
        style={sermon ? { borderLeftColor: sermon.seriesColor } : {}}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, weekStart)}
        onClick={() => setSelectedWeek(weekStart)}
      >
        <CardContent className="p-3 h-full">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Week {weekNumber}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(weekStart, 'MMM dd')}
            </span>
          </div>
          
          {sermon ? (
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, sermon)}
              className="space-y-1"
            >
              <h4 className="text-sm font-semibold line-clamp-1">{sermon.title}</h4>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: `${sermon.seriesColor}20`, color: sermon.seriesColor }}
                >
                  {sermon.seriesTitle}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {sermon.speaker}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {sermon.duration}m
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sermon Planning</h1>
          <p className="text-muted-foreground">
            Plan and organize your sermon calendar for {currentYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingSermon} onOpenChange={setIsAddingSermon}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Sermon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Sermon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Sermon title" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speaker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pastor-john">Pastor John</SelectItem>
                    <SelectItem value="sarah-wilson">Sarah Wilson</SelectItem>
                    <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSeries.map(series => (
                      <SelectItem key={series.id} value={series.title}>
                        {series.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Sermon description (optional)" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingSermon(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddingSermon(false)}>
                    Create Sermon
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sermons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterSeries} onValueChange={setFilterSeries}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {mockSeries.map(series => (
              <SelectItem key={series.id} value={series.title}>
                {series.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Series Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Series</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {mockSeries.map(series => (
              <div key={series.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span className="text-sm font-medium">{series.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {series.count} sermons
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Tabs defaultValue="annual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="annual">Annual View</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
        </TabsList>

        <TabsContent value="annual" className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {weeks.map((weekStart, index) => {
              const sermon = getSermonForWeek(weekStart)
              return (
                <WeekCard
                  key={index}
                  weekStart={weekStart}
                  sermon={sermon}
                />
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            Quarterly view coming soon...
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            Monthly view coming soon...
          </div>
        </TabsContent>
      </Tabs>

      {/* Week Detail Modal */}
      {selectedWeek && (
        <Dialog open={!!selectedWeek} onOpenChange={() => setSelectedWeek(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Week of {format(selectedWeek, 'MMMM dd, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const sermon = getSermonForWeek(selectedWeek)
                if (sermon) {
                  return (
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold">{sermon.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Speaker: {sermon.speaker}
                        </p>
                        <Badge style={{ backgroundColor: `${sermon.seriesColor}20`, color: sermon.seriesColor }}>
                          {sermon.seriesTitle}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">
                        No sermon scheduled for this week
                      </p>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Sermon
                      </Button>
                    </div>
                  )
                }
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}