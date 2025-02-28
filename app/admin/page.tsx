import { AdminControls } from "@/components/admin-controls"

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <AdminControls />
    </div>
  )
} 