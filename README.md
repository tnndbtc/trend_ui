# Trend Feed UI 🌍

An addictive, infinite-scroll web feed for discovering trending content from around the world. This Next.js application consumes the [Trend Crawler API](../crawler) to display trends from multiple platforms and regions in a unified, beautiful interface.

## Features ✨

- **Infinite Scroll Feed** - Smooth, addictive browsing experience
- **Multi-Region Support** - View trends from US, Japan, South Korea, China, or all regions
- **Dual Language Display** - Toggle between original language and English translations
- **Smart Filtering** - Filter by bucket categories, search titles, and enable "surprise" mode
- **User Feedback** - Like, dislike, save, or hide trend items
- **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- **Fast Performance** - Skeleton loaders and optimistic UI updates
- **No Authentication** - Frictionless browsing with client-side ID tracking

## Tech Stack 🛠️

- **[Next.js 14](https://nextjs.org/)** (App Router) - React framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[TailwindCSS](https://tailwindcss.com/)** - Styling
- **[Zustand](https://github.com/pmndrs/zustand)** - State management (optional)
- **[date-fns](https://date-fns.org/)** - Date formatting
- No database - pure API client

## Quick Start 🚀

### Prerequisites

- **Node.js 18+** installed
- **Trend Crawler API** running (see [crawler README](../crawler/README.md))

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your crawler API URL:

```bash
NEXT_PUBLIC_CRAWLER_API_BASE_URL=http://192.168.86.41:8002/api/v1
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts 📝

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build production bundle
npm start        # Start production server
npm run lint     # Run ESLint
```

## Project Structure 📁

```
trend_ui/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with header
│   ├── page.tsx             # Feed page (/)
│   ├── globals.css          # Global styles
│   └── item/[id]/page.tsx   # Item detail page
├── components/              # React components
│   ├── FeedCard.tsx         # Individual trend card
│   ├── FiltersBar.tsx       # Filter controls
│   ├── FeedbackButtons.tsx  # Like/Dislike/Save/Hide
│   ├── LoadingCard.tsx      # Skeleton loader
│   └── EmptyState.tsx       # No results state
├── lib/                     # Utilities
│   ├── api/
│   │   ├── client.ts        # Fetch wrapper + error handling
│   │   └── trends.ts        # Trends API calls
│   ├── storage.ts           # localStorage client_id
│   └── utils.ts             # Helper functions
├── types/
│   └── trend.ts             # TypeScript types
├── public/                  # Static assets
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── Dockerfile               # Production Docker build
├── docker-compose.yml       # Docker Compose config
└── README.md                # This file
```

## Docker Deployment 🐳

### Build and Run with Docker

```bash
# Build the image
docker build -t trend-ui .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_CRAWLER_API_BASE_URL=http://192.168.86.41:8002/api/v1 \
  trend-ui
```

### Using Docker Compose

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

Edit `docker-compose.yml` to change the crawler API URL.

## API Integration 🔌

This UI expects the Trend Crawler API to provide:

### Required Endpoints

#### `GET /api/v1/trends`

Fetch trending items with optional filters.

**Query Parameters:**
- `region` (optional) - Filter by region key (us, jp, kr, cn)
- `bucket` (optional) - Filter by bucket (comma-separated)
- `limit` (optional) - Max items to return (default: 20)
- `surprise` (optional) - Enable surprise mode (0 or 1)
- `cursor` (optional) - Pagination cursor (if supported)

**Response:**
```json
[
  {
    "id": 1,
    "url": "https://...",
    "platform": "reddit",
    "bucket": "hot_now",
    "region_key": "us",
    "title_original": "...",
    "description_original": "...",
    "original_locale": "en-US",
    "canonical_title": "...",
    "canonical_description": "...",
    "rank_position": 1,
    "engagement_signals": {...},
    "published_at": "2024-...",
    "collected_at": "2024-..."
  }
]
```

#### `POST /api/v1/feedback` (Optional)

Submit user feedback. If this endpoint doesn't exist, feedback is logged to localStorage.

**Request Body:**
```json
{
  "item_id": 123,
  "action": "like" | "dislike" | "save" | "hide"
}
```

**Headers:**
- `X-Client-Id`: UUID generated and stored in localStorage

## Features & UX 🎨

### Feed Controls

- **Region Selector** - View trends from specific regions or all
- **Language Toggle** - Switch between original and English
- **Bucket Filters** - Select multiple categories
- **Surprise Mode** - Enable for serendipitous discovery
- **Search** - Client-side title filtering

### Feed Cards

Each card displays:
- Platform and bucket badges
- Region indicator
- Rank position (if available)
- Title (original or translated)
- Short description (2-3 lines)
- Published/collected time
- Engagement metrics (views, upvotes, etc.)
- Feedback buttons
- Link to original source

### Item Detail Page

Click any card to view full details:
- Complete description
- Toggle between original and English
- All metadata (platform, bucket, rank, times)
- Full engagement signals
- Feedback actions
- Direct link to source

## User Feedback System 💬

The app tracks user preferences without authentication:

1. **Client ID**: Auto-generated UUID stored in localStorage
2. **Sent with every request**: `X-Client-Id` header
3. **Actions tracked**: Like, Dislike, Save, Hide
4. **Fallback**: If API endpoint doesn't exist, logs to localStorage

This allows the crawler service to learn user preferences and improve recommendations.

## Development Notes 🔧

### No Database

This repo is a **pure client** - all data comes from the Trend Crawler API. No database is maintained here.

### No Intelligence/ML

Intelligence features (trend analysis, recommendations, clustering) are handled by the Crawler service, not this UI.

### Graceful Degradation

- Missing API endpoints → Logged locally
- Missing fields in response → Show what's available
- API errors → Retry button with helpful message
- No results → Clear empty state

### Performance Optimizations

- Skeleton loaders for fast perceived performance
- Optimistic UI updates for feedback
- Client-side search filtering (no extra API calls)
- Debounced user interactions

## Environment Variables 🔐

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CRAWLER_API_BASE_URL` | Crawler API base URL | `http://localhost:8002/api/v1` |

**Note:** `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time.

## Troubleshooting 🔍

### "Failed to fetch trends"

- Check that the Crawler API is running
- Verify `NEXT_PUBLIC_CRAWLER_API_BASE_URL` is correct
- Check browser console for CORS errors
- Ensure API is accessible from your network

### Empty feed

- Check API response in browser DevTools Network tab
- Verify Crawler has collected data (check Django admin)
- Try different region/bucket filters
- Click "Retry" button

### Build errors

- Delete `node_modules` and `.next`
- Run `npm install` again
- Check Node.js version (18+ required)

## Contributing 🤝

This project follows the separation of concerns:

- **Trend UI** (this repo) - Client/rendering only
- **Trend Crawler** (../crawler) - Data collection, API, intelligence

Keep UI features separate from data/ML features.

## License 📄

MIT

## Links 🔗

- **Trend Crawler API**: http://192.168.86.41:8002/docs
- **Django Admin**: http://192.168.86.41:8001/admin
- **GitHub**: [Your repo URL here]

---

**Built with ❤️ and Next.js**

*Discover what's trending worldwide, in one addictive feed.*
