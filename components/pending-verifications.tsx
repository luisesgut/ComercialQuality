"use client"

import { useEffect, useState } from "react" // Agregamos useState para el modal, aunque no lo usemos directamente aquí
import { useRouter } from "next/navigation"
import { useVerifications, type Verification } from "@/lib/verification-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react"

// Configuración de estado (Se mantiene igual)
const statusConfig = {
  pending: {
    label: "Pendiente",
    variant: "outline" as const,
    icon: Clock,
  },
  "in-progress": {
    label: "En Progreso",
    variant: "default" as const,
    icon: PlayCircle,
  },
  completed: {
    label: "Completada",
    variant: "secondary" as const,
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rechazada",
    variant: "destructive" as const,
    icon: XCircle,
  },
}

// =========================================================================
// COMPONENTE PRINCIPAL: PendingVerifications
// (Se mantiene casi igual, enfocado en el fetching desde el Context)
// =========================================================================

export function PendingVerifications() {
  const router = useRouter()
  // Asumimos que fetchVerifications en useVerifications ya apunta a /api/Verificacion/activas
  const { getPendingVerifications, verifications, isLoading, error, fetchVerifications } = useVerifications()

  useEffect(() => {
    fetchVerifications()
  }, [])

  const pendingList = getPendingVerifications()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando verificaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verificaciones Pendientes</h2>
          </div>
        </div>
        <Card className="border-0 shadow-lg bg-card">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">Error de conexión</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => fetchVerifications()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Verificaciones Pendientes</h2>
          <p className="text-muted-foreground">
            {pendingList.length} verificación{pendingList.length !== 1 ? "es" : ""} en proceso
          </p>
        </div>
      </div>

      {/* Lista */}
      {pendingList.length === 0 ? (
        <Card className="border-0 shadow-lg bg-card">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">No hay verificaciones pendientes</h3>
            <p className="text-muted-foreground mb-6">Todas las verificaciones han sido completadas</p>
            <Button onClick={() => router.push("/dashboard/nueva-verificacion")}>Iniciar Nueva Verificación</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingList.map((verification) => (
            <VerificationCard key={verification.id} verification={verification} />
          ))}
        </div>
      )}

      {/* Verificaciones completadas recientes */}
      {verifications.filter((v) => v.status === "completed").length > 0 && (
        <div className="pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Completadas Recientemente</h3>
          <div className="space-y-4">
            {verifications
              .filter((v) => v.status === "completed")
              .slice(0, 3)
              .map((verification) => (
                <VerificationCard key={verification.id} verification={verification} compact />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// COMPONENTE: VerificationCard (Actualización de la navegación)
// =========================================================================

function VerificationCard({ verification, compact = false }: { verification: Verification; compact?: boolean }) {
  const router = useRouter()
  const config = statusConfig[verification.status]
  const StatusIcon = config.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Usamos un nombre/lote que asumes viene del GET /activas
  const cardTitle = verification.productName || `Verificación #${verification.id}`; 
  const lotDetails = verification.lotNumber ? `Lote: ${verification.lotNumber}` : `Cliente: ${verification.inspector}`;


  return (
    <Card className={`border-0 shadow-md bg-card hover:shadow-lg transition-shadow ${compact ? "opacity-75" : ""}`}>
      <CardContent className={compact ? "py-4" : "py-6"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`${compact ? "w-10 h-10" : "w-12 h-12"} rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}
            >
              <Package className={`${compact ? "w-5 h-5" : "w-6 h-6"} text-primary`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-card-foreground">{cardTitle}</h4>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{lotDetails}</p>
              {!compact && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inicio: {formatDate(verification.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Inspector: {verification.inspector}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!compact && (
            // ACCIÓN CLAVE: Redirige a la página de detalle de la verificación
            // que luego cargará el dashboard /api/Verificacion/dashboard/{id}
            <Button onClick={() => router.push(`/dashboard/verificacion/${verification.id}`)} className="shrink-0">
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalles
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}