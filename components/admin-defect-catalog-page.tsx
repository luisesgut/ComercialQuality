"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldAlert } from "lucide-react"

import { AdminDefectCatalog } from "@/components/admin-defect-catalog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function AdminDefectCatalogPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user?.role !== "Administrador") {
      router.push("/dashboard")
    }
  }, [isLoading, router, user?.role])

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando permisos...</p>
      </div>
    )
  }

  if (user?.role !== "Administrador") {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold tracking-wide text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            SOLO ADMINISTRADOR
          </div>
          <h2 className="text-2xl font-bold text-foreground">Catálogo de Defectos</h2>
          <p className="mt-1 text-muted-foreground">Administra las familias y defectos disponibles para verificación.</p>
        </div>

        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al panel
        </Button>
      </div>

      <AdminDefectCatalog />
    </div>
  )
}
