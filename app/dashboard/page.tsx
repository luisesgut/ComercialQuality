"use client"

import { AuthProvider } from "@/lib/auth-context"
import { VerificationProvider } from "@/lib/verification-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardMenu } from "@/components/dashboard-menu"

export default function DashboardPage() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <DashboardLayout>
          <DashboardMenu />
        </DashboardLayout>
      </VerificationProvider>
    </AuthProvider>
  )
}
