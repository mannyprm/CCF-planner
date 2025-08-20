import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SeriesCard } from "@/components/shared/SeriesCard"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  Users,
  BookOpen,
  Archive
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

// Mock data for series management
const initialSeries = {
  planning: [
    {
      id: '1',
      title: 'Grace Abounds',
      description: 'An 8-week exploration of God\'s incredible grace in our daily lives',
      status: 'planning' as const,
      startDate: new Date(2024, 2, 3), // March 3, 2024
      endDate: new Date(2024, 4, 26), // May 26, 2024
      totalSermons: 8,
      completedSermons: 0,
      speakers: ['Pastor John', 'Sarah Wilson', 'Mike Johnson'],
      theme: 'Grace and Mercy',
      color: '#F59E0B'
    },
    {
      id: '2',
      title: 'Living Hope',
      description: 'Finding hope in uncertain times through biblical wisdom',
      status: 'planning' as const,
      startDate: new Date(2024, 5, 2), // June 2, 2024
      endDate: new Date(2024, 6, 7), // July 7, 2024
      totalSermons: 6,
      completedSermons: 0,
      speakers: ['Emily Chen', 'David Park'],
      theme: 'Hope and Faith',
      color: '#8B5CF6'
    }
  ],
  active: [
    {
      id: '3',
      title: 'Foundations of Faith',
      description: 'Building strong spiritual foundations for new believers',
      status: 'active' as const,
      startDate: new Date(2024, 0, 7), // January 7, 2024
      endDate: new Date(2024, 2, 3), // March 3, 2024
      totalSermons: 8,
      completedSermons: 5,
      speakers: ['Pastor John', 'Sarah Wilson'],
      theme: 'Discipleship',
      color: '#10B981'
    }
  ],
  completed: [
    {
      id: '4',
      title: 'Fresh Start',
      description: 'New Year series focusing on spiritual renewal and growth',
      status: 'completed' as const,
      startDate: new Date(2023, 11, 31), // December 31, 2023
      endDate: new Date(2024, 0, 28), // January 28, 2024
      totalSermons: 4,
      completedSermons: 4,
      speakers: ['Pastor John', 'Mike Johnson'],
      theme: 'Renewal',
      color: '#3B82F6'
    },
    {
      id: '5',
      title: 'Advent Joy',
      description: 'Celebrating the joy of Christ\'s coming during the Advent season',
      status: 'completed' as const,
      startDate: new Date(2023, 11, 1), // December 1, 2023
      endDate: new Date(2023, 11, 24), // December 24, 2023
      totalSermons: 4,
      completedSermons: 4,
      speakers: ['Pastor John', 'Sarah Wilson', 'Emily Chen'],
      theme: 'Christmas',
      color: '#DC2626'
    }
  ]
}

export function SeriesManagement() {
  const [series, setSeries] = useState(initialSeries)
  const [isAddingSeries, setIsAddingSeries] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSeries, setSelectedSeries] = useState<any>(null)

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const sourceColumn = series[source.droppableId as keyof typeof series]
    const destColumn = series[destination.droppableId as keyof typeof series]
    const draggedSeries = sourceColumn.find((s: any) => s.id === draggableId)

    if (!draggedSeries) return

    // Update series status
    const updatedSeries = {
      ...draggedSeries,
      status: destination.droppableId as 'planning' | 'active' | 'completed'
    }

    // Remove from source
    const newSourceColumn = sourceColumn.filter((s: any) => s.id !== draggableId)
    
    // Add to destination
    const newDestColumn = [...destColumn]
    newDestColumn.splice(destination.index, 0, updatedSeries)

    setSeries({
      ...series,
      [source.droppableId]: newSourceColumn,
      [destination.droppableId]: newDestColumn
    })
  }

  // Filter series based on search
  const filterSeries = (seriesList: any[]) => {
    return seriesList.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.theme.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const getColumnTitle = (columnId: string) => {
    switch (columnId) {
      case 'planning':
        return 'Planning'
      case 'active':
        return 'Active'
      case 'completed':
        return 'Completed'
      default:
        return columnId
    }
  }

  const getColumnCount = (columnId: string) => {
    return series[columnId as keyof typeof series].length
  }

  const getColumnColor = (columnId: string) => {
    switch (columnId) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Series Management</h1>
          <p className="text-muted-foreground">
            Organize and track your sermon series from planning to completion
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingSeries} onOpenChange={setIsAddingSeries}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Series
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Series</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Series Title</label>
                    <Input placeholder="Enter series title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <Input placeholder="e.g., Grace, Faith, Love" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Describe the series purpose and content" />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Sermons</label>
                    <Input type="number" placeholder="8" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <Input type="color" defaultValue="#3B82F6" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Speakers</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select speakers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pastor-john">Pastor John</SelectItem>
                      <SelectItem value="sarah-wilson">Sarah Wilson</SelectItem>
                      <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                      <SelectItem value="emily-chen">Emily Chen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingSeries(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddingSeries(false)}>
                    Create Series
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-sm font-medium">Planning</div>
                <div className="text-2xl font-bold">{getColumnCount('planning')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-2xl font-bold">{getColumnCount('active')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">Completed</div>
                <div className="text-2xl font-bold">{getColumnCount('completed')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">Total Series</div>
                <div className="text-2xl font-bold">
                  {getColumnCount('planning') + getColumnCount('active') + getColumnCount('completed')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-3">
          {Object.keys(series).map((columnId) => (
            <div key={columnId} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{getColumnTitle(columnId)}</h2>
                  <Badge className={getColumnColor(columnId)}>
                    {getColumnCount(columnId)}
                  </Badge>
                </div>
              </div>
              
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent'
                    }`}
                  >
                    {filterSeries(series[columnId as keyof typeof series]).map((seriesItem: any, index: number) => (
                      <Draggable key={seriesItem.id} draggableId={seriesItem.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`transition-transform ${
                              snapshot.isDragging ? 'rotate-2 scale-105' : ''
                            }`}
                          >
                            <SeriesCard
                              series={seriesItem}
                              onEdit={() => console.log('Edit series:', seriesItem.id)}
                              onAddSermon={() => console.log('Add sermon to series:', seriesItem.id)}
                              onArchive={() => console.log('Archive series:', seriesItem.id)}
                              onViewDetails={() => setSelectedSeries(seriesItem)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {filterSeries(series[columnId as keyof typeof series]).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No series in {columnId}</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Series Detail Modal */}
      {selectedSeries && (
        <Dialog open={!!selectedSeries} onOpenChange={() => setSelectedSeries(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSeries.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedSeries.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Theme</h4>
                  <Badge variant="outline">{selectedSeries.theme}</Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Status</h4>
                  <Badge className={getColumnColor(selectedSeries.status)}>
                    {selectedSeries.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSeries.startDate.toLocaleDateString()} - {selectedSeries.endDate?.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Progress</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSeries.completedSermons}/{selectedSeries.totalSermons} sermons
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Speakers</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSeries.speakers.map((speaker: string, index: number) => (
                    <Badge key={index} variant="outline">{speaker}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline">Edit Series</Button>
                <Button>View Sermons</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}