import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import { Toaster } from "sonner";
import { AppStateProvider } from "@/lib/context/app-state";

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
  { name: 'Design System', href: '/design-system' },
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
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppStateProvider>
            <div className="min-h-screen bg-primary-black-50 text-primary-black-800 dark:bg-primary-black-900 dark:text-primary-black-50">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            </div>
            <Toaster />
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
