"use client"

import { AuthProvider } from "@/lib/auth-context"
import { VerificationProvider } from "@/lib/verification-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { NewVerificationForm } from "@/components/new-verification-form"

export default function NuevaVerificacionPage() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <DashboardLayout>
          <NewVerificationForm />
        </DashboardLayout>
      </VerificationProvider>
    </AuthProvider>
  )
}
