# Lyncis — Data Cleaning House

A modern, offline-first Jastip order management system built with Next.js 16, featuring intelligent data intake and batch processing capabilities.

## 🚀 Features

### Phase 1: The Open Bucket (✅ Complete)
- **Order Management**: Full CRUD operations with IndexedDB persistence
- **Tag-based Filtering**: Dynamic sidebar with active/archived tag sections
- **Circular Pricing Logic**: Smart item pricing with manual total override support
- **Responsive Design**: Collapsible sidebar with smooth animations
- **Premium UI**: Shadcn/UI components with polished micro-interactions

### Phase 2: Smart Intake Zone (✅ Complete)
- **Excel Upload**: Drag-and-drop with sticky header mapping (localStorage-based)
- **WhatsApp Parser**: Regex-based extraction with AI fallback (Gemini 2.5 Flash Lite)
- **Unified Intake Dialog**: Tabbed interface for manual entry, Excel, and WhatsApp parsing
- **Intelligent Processing**: Automatic parser selection based on confidence scores
- **Tag Autocomplete**: Smart filtering showing only active tags

### Phase 3: Fulfillment & Batching (🚧 Planned)
- Multi-select order processing
- Logistics calculations (volumetric weight, chargeable weight)
- Batch drawer with origin selection
- Floating action bar for bulk operations

### Phase 4: Polish & PWA (🚧 In Progress)
- **Indonesian Location Dictionary**: Integrated 80k+ records (BPS/Postal codes) with smart alias matching (✅ Complete)
- **Location Autocomplete**: Smart address completion in intake and edit forms (✅ Complete)
- **PWA configuration**: Offline capability for field use
- **Bahasa Indonesia label audit**: Ongoing refinement of terminology
- **Responsive design refinements**: Continued mobile optimization

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Dexie.js (IndexedDB wrapper)
- **UI Components**: Shadcn/UI + Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: Google Generative AI (Gemini 2.5 Flash Lite)
- **Data Source**: Indonesian Location Dictionary (BPS/Kemendagri)

## 📦 Getting Started

### Prerequisites
- Node.js ≥ 20
- npm/yarn/pnpm/bun

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables (for AI features)
cp .env.local.example .env.local
# Add your GEMINI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                # Shadcn/UI base components
│   └── lyncis/            # Application-specific components
│       ├── bucket/        # Order table, sidebar, dialogs
│       ├── intake/        # Excel/WhatsApp parsers, intake dialog
│       ├── fulfillment/   # Batch processing (planned)
│       └── shared/        # Reusable components
├── hooks/                 # Custom React hooks (DB operations)
├── lib/                   # Utilities and business logic
│   ├── db.ts             # Dexie database schema
│   ├── types.ts          # TypeScript interfaces
│   ├── location-matcher.ts # Smart location matching logic
│   ├── whatsapp-parser.ts # WhatsApp text extraction
│   ├── llm-parser.ts     # AI-powered parsing
│   └── pricing.ts        # Circular pricing logic
└── artifacts/
    └── superpowers/       # Project planning & tracking
```

## 🎯 Current Status

**Phase 1 & 2: Complete** ✅
- All core features implemented and tested
- Sidebar animations refined with burger menu toggle
- Table expansion optimized for ultra-wide displays
- Intake dialog polished with active tag filtering

**Phase 4: Partial** 🚧
- Indonesian address dictionary with autocomplete (Integrated)
- Smart WhatsApp Parser refinements (Confidence-based filtering)
- Automated Test Suite: Regex parser validation with 20+ test cases (✅ Complete)
- **Security Hardening**: Migrated sensitive configuration to Server Actions & private Env Vars (✅ Complete)
- **High-Contrast Notifications**: Themed Sonner toasts with color-coded borders, icons, and close buttons (✅ Complete)
- UI/UX polish for intake zone

**Next Up: Phase 3** 🚧
- Multi-select state manager
- Floating action bar
- Logistics calculations
- Batch processing drawer

## 🔧 Development

```bash
# Run linter
npm run lint

# Type checking
npx tsc --noEmit

# Clean build
rm -rf .next && npm run build
```

## 📝 License

This project is part of the Lyncis POC initiative.

---

**Last Updated**: February 17, 2026  
**Build Status**: ✅ Passing production build (Next.js 16)
