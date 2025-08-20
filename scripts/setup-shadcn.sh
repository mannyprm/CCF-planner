#!/bin/bash

# CCF Planner - shadcn/ui Setup Script
# This script installs and configures shadcn/ui components for the frontend

echo "🚀 Setting up shadcn/ui for CCF Planner..."

# Navigate to frontend directory
cd src/frontend

# Install Tailwind CSS and dependencies
echo "📦 Installing Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npm install clsx tailwind-merge class-variance-authority

# Install Radix UI primitives
echo "📦 Installing Radix UI primitives..."
npm install @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs
npm install @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-select
npm install @radix-ui/react-separator @radix-ui/react-toast @radix-ui/react-avatar
npm install @radix-ui/react-scroll-area @radix-ui/react-popover @radix-ui/react-tooltip

# Install additional dependencies
echo "📦 Installing additional dependencies..."
npm install lucide-react date-fns jotai
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities tunnel-rat
npm install @hookform/resolvers react-hook-form zod

# Initialize Tailwind
echo "🎨 Initializing Tailwind CSS..."
npx tailwindcss init -p

# Install shadcn/ui CLI and components
echo "🎨 Installing shadcn/ui components..."
npx shadcn-ui@latest init -y

# Install core components
echo "📦 Installing core shadcn/ui components..."
npx shadcn-ui@latest add button -y
npx shadcn-ui@latest add card -y
npx shadcn-ui@latest add dialog -y
npx shadcn-ui@latest add dropdown-menu -y
npx shadcn-ui@latest add input -y
npx shadcn-ui@latest add label -y
npx shadcn-ui@latest add select -y
npx shadcn-ui@latest add separator -y
npx shadcn-ui@latest add sheet -y
npx shadcn-ui@latest add table -y
npx shadcn-ui@latest add tabs -y
npx shadcn-ui@latest add textarea -y
npx shadcn-ui@latest add toast -y
npx shadcn-ui@latest add avatar -y
npx shadcn-ui@latest add badge -y
npx shadcn-ui@latest add scroll-area -y
npx shadcn-ui@latest add tooltip -y
npx shadcn-ui@latest add command -y
npx shadcn-ui@latest add popover -y
npx shadcn-ui@latest add form -y

echo "✅ shadcn/ui setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Visit http://localhost:5173 to see your application"
echo "3. Check docs/shadcn-implementation.md for component examples"
echo ""
echo "🎉 Happy coding!"