import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trendy Bets",
  description: "Sports betting made simple",
};

const navigation = [
  { name: 'Trendy Bets', href: '/' },
  { name: 'Betting', href: '/betting' },
  { name: 'Sync', href: '/sync' },
  { name: 'Trendy Games', href: '/trendy-games' },
  { name: 'Calculators', href: '/calculators' },
  { name: 'Trendy Props', href: '/trendy-props' },
  { name: 'Run Predictions', href: '/run-predictions' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
