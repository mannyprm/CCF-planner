import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { StatisticsCard } from "@/components/shared/StatisticsCard"
import { ActivityFeed } from "@/components/shared/ActivityFeed"
import { SermonCard } from "@/components/shared/SermonCard"
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  Plus,
  ArrowRight
} from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { Link } from "react-router-dom"

// Mock data
const mockStats = [
  {
    title: "Total Sermons",
    value: 156,
    change: { value: 12, label: "vs last month", type: 'increase' as const },
    icon: BookOpen,
    description: "All time"
  },
  {
    title: "Upcoming Series",
    value: 3,
    change: { value: 0, label: "no change", type: 'neutral' as const },
    icon: CalendarIcon,
    description: "Next 3 months"
  },
  {
    title: "Team Members",
    value: 8,
    change: { value: 2, label: "new this month", type: 'increase' as const },
    icon: Users,
    description: "Active contributors"
  },
  {
    title: "Engagement Rate",
    value: "87%",
    change: { value: 5, label: "vs last quarter", type: 'increase' as const },
    icon: TrendingUp,
    description: "Audience feedback"
  }
]

const mockActivities = [
  {
    id: '1',
    type: 'sermon_created' as const,
    user: { name: 'John Doe', avatar: '/placeholder-avatar.jpg' },
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    title: 'Created new sermon "The Heart of Worship"',
    metadata: { seriesTitle: 'Foundations of Faith' }
  },
  {
    id: '2',
    type: 'sermon_scheduled' as const,
    user: { name: 'Sarah Wilson', avatar: '/placeholder-avatar.jpg' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    title: 'Scheduled sermon for next Sunday',
    metadata: { 
      sermonTitle: 'Walking in Faith',
      targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  },
  {
    id: '3',
    type: 'series_created' as const,
    user: { name: 'Mike Johnson', avatar: '/placeholder-avatar.jpg' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    title: 'Started new sermon series "Grace Abounds"',
    description: '8-week series starting in March'
  },
  {
    id: '4',
    type: 'collaboration' as const,
    user: { name: 'Emily Chen', avatar: '/placeholder-avatar.jpg' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    title: 'Added feedback to sermon outline',
    metadata: { sermonTitle: 'Love in Action' }
  }
]

const mockUpcomingSermons = [
  {
    id: '1',
    title: 'The Heart of Worship',
    speaker: { name: 'Pastor John', avatar: '/placeholder-avatar.jpg' },
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
    status: 'scheduled' as const,
    seriesTitle: 'Foundations of Faith'
  },
  {
    id: '2',
    title: 'Walking in Faith',
    speaker: { name: 'Sarah Wilson', avatar: '/placeholder-avatar.jpg' },
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // 10 days from now
    status: 'draft' as const,
    seriesTitle: 'Foundations of Faith'
  }
]

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [weekSermons, setWeekSermons] = useState<any[]>([])

  useEffect(() => {
    // Mock data for calendar week view
    if (selectedDate) {
      const weekStart = startOfWeek(selectedDate)
      const weekEnd = endOfWeek(selectedDate)
      
      // Mock sermons for the selected week
      const sermonsThisWeek = [
        {
          date: addDays(weekStart, 0), // Sunday
          title: 'The Heart of Worship',
          speaker: 'Pastor John'
        }
      ]
      setWeekSermons(sermonsThisWeek)
    }
  }, [selectedDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your sermon planning.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/sermons/new">
              <Plus className="h-4 w-4 mr-2" />
              New Sermon
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/series/new">
              <Plus className="h-4 w-4 mr-2" />
              New Series
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockStats.map((stat, index) => (
          <StatisticsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <ActivityFeed activities={mockActivities} maxItems={8} />
          
          {/* Upcoming Sermons */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Sermons</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/planning">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockUpcomingSermons.map((sermon) => (
                <SermonCard
                  key={sermon.id}
                  sermon={sermon}
                  compact
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Calendar & Quick Actions */}
        <div className="space-y-6">
          {/* Calendar Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              
              {/* Week View */}
              {selectedDate && weekSermons.length > 0 && (
                <div className="mt-4 p-3 bg-accent rounded-lg">
                  <h4 className="font-medium mb-2">
                    Week of {format(startOfWeek(selectedDate), 'MMM dd')}
                  </h4>
                  {weekSermons.map((sermon, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{format(sermon.date, 'EEEE')}</div>
                      <div className="text-muted-foreground">
                        {sermon.title} - {sermon.speaker}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/planning">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  View Annual Plan
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/series">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Series
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/analytics">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/export">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Export Data
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Drafts */}
          <Card>
            <CardHeader>
              <CardTitle>Draft Sermons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">Grace in Times of Trial</div>
                    <div className="text-xs text-muted-foreground">Last edited 2 hours ago</div>
                  </div>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">The Power of Prayer</div>
                    <div className="text-xs text-muted-foreground">Last edited yesterday</div>
                  </div>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}