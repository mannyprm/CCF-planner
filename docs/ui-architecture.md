# CCF Planner - UI Architecture with shadcn/ui

## Overview
The CCF Sermon Planning System UI is built with Next.js 14, TypeScript, and shadcn/ui components for a modern, accessible, and performant experience.

## Core UI Components Mapping

### 1. Authentication & Onboarding
- **Component**: Custom auth page with Firebase integration
- **shadcn components**: 
  - `dialog` - Login modal
  - `tabs` - Switch between login/signup
  - `animated-tooltip` - Help text
  - `spinner` - Loading states

### 2. Dashboard Layout
- **Component**: Main application shell
- **shadcn components**:
  - `navbar-14` - Top navigation with user menu
  - `sidebar` - Collapsible navigation
  - `theme-switcher` - Dark/light mode toggle
  - `avatar-group` - Active collaborators
  - `dock` - Quick action toolbar

### 3. Annual Planning View
- **Component**: Year-at-a-glance calendar
- **shadcn components**:
  - `calendar` - Interactive yearly calendar
  - `mini-calendar` - Quick navigation
  - `tabs` - Switch between views (Year/Quarter/Month)
  - `bar-chart-05` - Sermon distribution analytics
  - `pie-chart-03` - Theme distribution

### 4. Series Management
- **Component**: Kanban board for series planning
- **shadcn components**:
  - `kanban` - Drag-and-drop series management
  - `dialog-stack` - Nested modals for series details
  - `tags` - Series themes/categories
  - `status` - Series completion status
  - `animated-modal` - Series creation wizard

### 5. Sermon Editor
- **Component**: Rich text editor with timeline
- **shadcn components**:
  - `minimal-tiptap` - Rich text editing
  - `tabs` - Switch between sections (Outline/Scripture/Notes)
  - `combobox` - Scripture verse selector
  - `gantt` - Sermon prep timeline
  - `choicebox` - Media type selection

### 6. Collaboration Features
- **Component**: Real-time collaboration tools
- **shadcn components**:
  - `avatar-group` - Active editors
  - `animated-tooltip` - User presence
  - `message-dock` - Comments panel
  - `relative-time` - Activity timestamps
  - `list` - Version history

### 7. Export Center
- **Component**: Multi-format export interface
- **shadcn components**:
  - `table` - Export preview
  - `choicebox` - Format selection
  - `calendar` - Date range picker
  - `dialog` - Export settings
  - `spinner` - Export progress

### 8. Analytics Dashboard
- **Component**: Insights and metrics
- **shadcn components**:
  - `area-chart-06` - Sermon trends
  - `bar-chart-08` - Monthly distribution
  - `pie-chart-07` - Topic breakdown
  - `line-chart-04` - Engagement metrics
  - `counting-number` - Key statistics

## Page Structure

```
/
├── auth/
│   └── login                 # Firebase authentication
├── dashboard/                # Main dashboard
├── planning/
│   ├── annual/              # Yearly planning view
│   ├── series/              # Series kanban board
│   └── calendar/            # Calendar view
├── sermons/
│   ├── [id]/               # Individual sermon editor
│   └── new/                # Create new sermon
├── export/                  # Export center
├── analytics/              # Analytics dashboard
└── settings/               # User & system settings
```

## Component Library Structure

```
src/frontend/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard specific
│   ├── planning/          # Planning views
│   ├── sermon/            # Sermon editor
│   ├── export/            # Export functionality
│   └── shared/            # Shared components
├── lib/
│   ├── firebase/          # Firebase config
│   ├── api/              # API client
│   └── utils/            # Utilities
├── hooks/                 # Custom React hooks
├── styles/               # Global styles
└── types/                # TypeScript types
```

## Key Features Implementation

### 1. Real-time Collaboration
- WebSocket connection for live updates
- Presence indicators using `avatar-group`
- Conflict resolution with `dialog` prompts
- Auto-save with `toast` notifications

### 2. Drag & Drop
- `kanban` for series management
- `@dnd-kit` for custom drag interactions
- Visual feedback with `animated-beam`

### 3. Responsive Design
- Mobile-first approach
- `mac-os-dock` for mobile navigation
- Collapsible `sidebar` on tablets
- Touch-optimized interactions

### 4. Performance Optimizations
- Next.js App Router with RSC
- Dynamic imports for heavy components
- `react-query` for data caching
- Optimistic UI updates

### 5. Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- High contrast mode support

## Theme Configuration

```typescript
// Dark/Light theme with shadcn
const themes = {
  light: {
    primary: "blue-600",
    secondary: "gray-600",
    background: "white",
    foreground: "gray-900"
  },
  dark: {
    primary: "blue-400",
    secondary: "gray-400", 
    background: "gray-900",
    foreground: "white"
  }
}
```

## Next Steps

1. Initialize Next.js with TypeScript
2. Install and configure Tailwind CSS
3. Set up shadcn/ui CLI
4. Install required components
5. Create base layouts
6. Implement authentication flow
7. Build dashboard components
8. Add real-time features
9. Implement export functionality
10. Deploy to DigitalOcean