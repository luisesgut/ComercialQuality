"use client"

import { AuthProvider } from "@/lib/auth-context"
import { VerificationProvider } from "@/lib/verification-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VerificationConsultation } from "@/components/verification-consultation"

export default function ConsultarVerificacionPage() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <DashboardLayout>
          <VerificationConsultation />
        </DashboardLayout>
      </VerificationProvider>
    </AuthProvider>
  )
}
