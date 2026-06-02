import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trend Feed - Discover Global Trends",
  description: "Explore trending content from around the world in one addictive feed",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="mr-4 flex">
                <a className="mr-6 flex items-center space-x-2" href="/">
                  <span className="font-bold text-xl">🌍 Trend Feed</span>
                </a>
              </div>
              <nav className="flex items-center gap-1">
                {/* Feed tab hidden — uncomment to restore
                <a
                  href="/app"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  Feed
                </a>
                */}
                <a
                  href="/app/stories"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  Stories
                </a>
                <a
                  href="/app/subscribers"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  Subscribers
                </a>
                <a
                  href="/app/comments"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  Comments
                </a>
                <a
                  href="/app/performance"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  📊 Performance
                </a>
                <a
                  href="/app/games"
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  ♟ KataGo
                </a>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
