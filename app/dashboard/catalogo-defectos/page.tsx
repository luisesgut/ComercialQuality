"use client"

import { AuthProvider } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminDefectCatalogPage } from "@/components/admin-defect-catalog-page"

export default function CatalogoDefectosPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <AdminDefectCatalogPage />
      </DashboardLayout>
    </AuthProvider>
  )
}
