import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Save, 
  Share, 
  Eye, 
  Clock, 
  Users, 
  BookOpen, 
  FileText, 
  Image, 
  Video, 
  Music,
  Plus,
  X,
  MessageSquare,
  Edit,
  Check,
  AlertCircle
} from "lucide-react"

// Mock data for sermon editor
const mockSermon = {
  id: '1',
  title: 'The Heart of Worship',
  speaker: 'Pastor John',
  date: new Date(2024, 2, 10),
  series: 'Foundations of Faith',
  status: 'draft',
  lastSaved: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  outline: {
    introduction: 'Opening thoughts on worship...',
    mainPoints: [
      'True worship comes from the heart',
      'Worship is a lifestyle, not just music',
      'God seeks authentic worshipers'
    ],
    conclusion: 'Closing thoughts and prayer...'
  },
  scriptures: [
    { reference: 'John 4:23-24', text: 'Yet a time is coming and has now come when the true worshipers will worship the Father in the Spirit and in truth...' },
    { reference: 'Psalm 95:6', text: 'Come, let us bow down in worship, let us kneel before the Lord our Maker...' }
  ],
  media: [
    { type: 'image', name: 'worship-background.jpg', url: '/placeholder-image.jpg' },
    { type: 'video', name: 'worship-intro.mp4', url: '/placeholder-video.mp4' }
  ],
  tags: ['worship', 'heart', 'authentic', 'lifestyle'],
  duration: 35,
  notes: 'Remember to emphasize the personal application points'
}

const mockCollaborators = [
  { id: '1', name: 'Sarah Wilson', avatar: '/placeholder-avatar.jpg', role: 'Editor', status: 'online' },
  { id: '2', name: 'Mike Johnson', avatar: '/placeholder-avatar.jpg', role: 'Reviewer', status: 'offline' },
  { id: '3', name: 'Emily Chen', avatar: '/placeholder-avatar.jpg', role: 'Viewer', status: 'online' }
]

const mockComments = [
  {
    id: '1',
    user: { name: 'Sarah Wilson', avatar: '/placeholder-avatar.jpg' },
    text: 'Great opening illustration! This really captures the essence of worship.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    section: 'introduction'
  },
  {
    id: '2',
    user: { name: 'Mike Johnson', avatar: '/placeholder-avatar.jpg' },
    text: 'Consider adding more practical examples for point 2.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    section: 'mainPoints'
  }
]

export function SermonEditor() {
  const { id } = useParams()
  const [sermon, setSermon] = useState(mockSermon)
  const [activeTab, setActiveTab] = useState("outline")
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [newTag, setNewTag] = useState('')
  const [newScripture, setNewScripture] = useState({ reference: '', text: '' })

  // Auto-save simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSaveStatus('saving')
      setTimeout(() => setAutoSaveStatus('saved'), 1000)
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleTitleChange = (title: string) => {
    setSermon({ ...sermon, title })
    setAutoSaveStatus('unsaved')
  }

  const handleOutlineChange = (section: string, value: string) => {
    setSermon({
      ...sermon,
      outline: { ...sermon.outline, [section]: value }
    })
    setAutoSaveStatus('unsaved')
  }

  const addMainPoint = () => {
    const newPoints = [...sermon.outline.mainPoints, 'New main point']
    setSermon({
      ...sermon,
      outline: { ...sermon.outline, mainPoints: newPoints }
    })
  }

  const updateMainPoint = (index: number, value: string) => {
    const newPoints = [...sermon.outline.mainPoints]
    newPoints[index] = value
    setSermon({
      ...sermon,
      outline: { ...sermon.outline, mainPoints: newPoints }
    })
    setAutoSaveStatus('unsaved')
  }

  const removeMainPoint = (index: number) => {
    const newPoints = sermon.outline.mainPoints.filter((_, i) => i !== index)
    setSermon({
      ...sermon,
      outline: { ...sermon.outline, mainPoints: newPoints }
    })
  }

  const addTag = () => {
    if (newTag.trim() && !sermon.tags.includes(newTag.trim())) {
      setSermon({
        ...sermon,
        tags: [...sermon.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setSermon({
      ...sermon,
      tags: sermon.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const addScripture = () => {
    if (newScripture.reference.trim() && newScripture.text.trim()) {
      setSermon({
        ...sermon,
        scriptures: [...sermon.scriptures, newScripture]
      })
      setNewScripture({ reference: '', text: '' })
    }
  }

  const getAutoSaveIcon = () => {
    switch (autoSaveStatus) {
      case 'saved':
        return <Check className="h-4 w-4 text-green-600" />
      case 'saving':
        return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
      case 'unsaved':
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getAutoSaveText = () => {
    switch (autoSaveStatus) {
      case 'saved':
        return 'All changes saved'
      case 'saving':
        return 'Saving...'
      case 'unsaved':
        return 'Unsaved changes'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <Input
            value={sermon.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
            placeholder="Sermon Title"
          />
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Series: {sermon.series}</span>
            <span>Speaker: {sermon.speaker}</span>
            <span>Date: {sermon.date.toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getAutoSaveIcon()}
            {getAutoSaveText()}
          </div>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Status and Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {sermon.status}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {sermon.duration} minutes
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last saved: {sermon.lastSaved.toLocaleTimeString()}
          </div>
          <div className="flex -space-x-2">
            {mockCollaborators.map((collab) => (
              <Avatar key={collab.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={collab.avatar} />
                <AvatarFallback className="text-xs">
                  {collab.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Editor Content */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="scriptures">Scriptures</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="outline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Introduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={sermon.outline.introduction}
                    onChange={(e) => handleOutlineChange('introduction', e.target.value)}
                    placeholder="Opening thoughts, hook, context..."
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Main Points</CardTitle>
                  <Button variant="outline" size="sm" onClick={addMainPoint}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Point
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sermon.outline.mainPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <Input
                        value={point}
                        onChange={(e) => updateMainPoint(index, e.target.value)}
                        placeholder={`Main point ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMainPoint(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conclusion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={sermon.outline.conclusion}
                    onChange={(e) => handleOutlineChange('conclusion', e.target.value)}
                    placeholder="Summary, application, call to action..."
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scriptures" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scripture References</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sermon.scriptures.map((scripture, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="font-semibold text-sm mb-2">{scripture.reference}</div>
                      <div className="text-sm text-muted-foreground">{scripture.text}</div>
                    </div>
                  ))}
                  
                  <div className="space-y-2 p-4 border-2 border-dashed rounded-lg">
                    <Input
                      value={newScripture.reference}
                      onChange={(e) => setNewScripture({ ...newScripture, reference: e.target.value })}
                      placeholder="Scripture reference (e.g., John 3:16)"
                    />
                    <Textarea
                      value={newScripture.text}
                      onChange={(e) => setNewScripture({ ...newScripture, text: e.target.value })}
                      placeholder="Scripture text..."
                    />
                    <Button onClick={addScripture}>Add Scripture</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Media Files</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sermon.media.map((media, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        {media.type === 'image' && <Image className="h-5 w-5 text-blue-600" />}
                        {media.type === 'video' && <Video className="h-5 w-5 text-purple-600" />}
                        {media.type === 'audio' && <Music className="h-5 w-5 text-green-600" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{media.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{media.type}</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sermon Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={sermon.notes}
                    onChange={(e) => setSermon({ ...sermon, notes: e.target.value })}
                    placeholder="Additional notes, reminders, personal insights..."
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sermon Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sermon Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Speaker</label>
                <Select value={sermon.speaker}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pastor John">Pastor John</SelectItem>
                    <SelectItem value="Sarah Wilson">Sarah Wilson</SelectItem>
                    <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={sermon.date.toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
                <Input
                  type="number"
                  value={sermon.duration}
                  onChange={(e) => setSermon({ ...sermon, duration: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={sermon.status}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {sermon.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Collaborators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockCollaborators.map((collab) => (
                <div key={collab.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={collab.avatar} />
                    <AvatarFallback className="text-xs">
                      {collab.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{collab.name}</div>
                    <div className="text-xs text-muted-foreground">{collab.role}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    collab.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({mockComments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockComments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {comment.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{comment.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {comment.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs">{comment.text}</p>
                  <Separator />
                </div>
              ))}
              <Textarea
                placeholder="Add a comment..."
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}