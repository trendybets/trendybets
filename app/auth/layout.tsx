import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication - TrendyBets",
  description: "Sign in or create an account for TrendyBets",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-black-50 to-primary-black-100">
      {children}
    </div>
  )
}
