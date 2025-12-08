"use client"

import { AuthProvider } from "@/lib/auth-context"
import { VerificationProvider } from "@/lib/verification-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PendingVerifications } from "@/components/pending-verifications"

export default function PendientesPage() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <DashboardLayout>
          <PendingVerifications />
        </DashboardLayout>
      </VerificationProvider>
    </AuthProvider>
  )
}
