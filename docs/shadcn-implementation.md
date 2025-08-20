# shadcn/ui Implementation Guide for CCF Planner

## Installation Steps

### 1. Install Dependencies

```bash
cd src/frontend
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npm install clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs
npm install lucide-react
```

### 2. Install shadcn/ui CLI

```bash
npx shadcn-ui@latest init
```

### 3. Install Required Components

```bash
# Core components for the sermon planner
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add command
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add tooltip
```

## Component Examples

### 1. Dashboard Layout

```tsx
// src/components/dashboard/DashboardLayout.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Calendar, FileText, Home, Menu, Settings, Users } from "lucide-react"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px]">
              <nav className="flex flex-col space-y-2">
                <Button variant="ghost" className="justify-start">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Planning
                </Button>
                <Button variant="ghost" className="justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Sermons
                </Button>
                <Button variant="ghost" className="justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-1 items-center justify-between space-x-2">
            <h1 className="text-xl font-bold">CCF Sermon Planner</h1>
            
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src="/avatar.png" />
                <AvatarFallback>UN</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}
```

### 2. Sermon Card Component

```tsx
// src/components/sermon/SermonCard.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Edit, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SermonCardProps {
  title: string
  date: string
  series: string
  speaker: string
  status: 'draft' | 'review' | 'ready' | 'delivered'
}

export function SermonCard({ title, date, series, speaker, status }: SermonCardProps) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-blue-100 text-blue-800'
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{series}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1 h-3 w-3" />
            {date}
          </div>
          <div className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            {speaker}
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Badge className={statusColors[status]} variant="secondary">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </CardFooter>
    </Card>
  )
}
```

### 3. Annual Planning Calendar

```tsx
// src/components/planning/AnnualCalendar.tsx
import { useState } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AnnualCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Planning</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="year" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
          
          <TabsContent value="year" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(12)].map((_, i) => (
                <Calendar
                  key={i}
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  defaultMonth={new Date(2024, i)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="quarter">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <Calendar
                  key={i}
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="month">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

## Migration from MUI

### Component Mapping

| MUI Component | shadcn/ui Replacement |
|--------------|----------------------|
| `<Button>` | `<Button>` with variants |
| `<TextField>` | `<Input>` + `<Label>` |
| `<Select>` | `<Select>` |
| `<Dialog>` | `<Dialog>` |
| `<Card>` | `<Card>` |
| `<Tabs>` | `<Tabs>` |
| `<Avatar>` | `<Avatar>` |
| `<IconButton>` | `<Button variant="ghost" size="icon">` |
| `<Chip>` | `<Badge>` |
| `<Alert>` | `<Alert>` or Toast |
| `<Menu>` | `<DropdownMenu>` |
| `<Drawer>` | `<Sheet>` |
| `<CircularProgress>` | Custom spinner or loading state |

## Theming

### Update Vite Config

```ts
// vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

### Theme Provider

```tsx
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: "system",
  setTheme: () => null,
})

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
```

## Best Practices

1. **Component Organization**: Keep shadcn components in `src/components/ui/`
2. **Custom Components**: Build domain-specific components in separate folders
3. **Styling**: Use Tailwind utility classes, avoid inline styles
4. **Accessibility**: shadcn components include ARIA attributes by default
5. **Responsiveness**: Use Tailwind's responsive modifiers (sm:, md:, lg:)
6. **Dark Mode**: Use CSS variables for consistent theming
7. **Performance**: Components are tree-shakeable and optimized

## Next Steps

1. Install all dependencies
2. Set up the base components
3. Migrate existing MUI components one by one
4. Test responsive behavior
5. Implement dark mode toggle
6. Add loading states and error boundaries
7. Optimize bundle size