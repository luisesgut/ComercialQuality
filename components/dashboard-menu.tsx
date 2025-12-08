"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVerifications } from "@/lib/verification-context"
import { PlusCircle, ClipboardList, CheckCircle2, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react"

export function DashboardMenu() {
  const router = useRouter()
  const { getPendingVerifications, verifications, isLoading, error, fetchVerifications } = useVerifications()

  useEffect(() => {
    fetchVerifications()
  }, [])

  const pendingCount = getPendingVerifications().length
  const completedCount = verifications.filter((v) => v.status === "completed").length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="border-0 shadow-lg bg-card max-w-md w-full">
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Panel de Control</h2>
        <p className="text-muted-foreground mt-1">Gestiona las verificaciones de productos BIOFLEX</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{verifications.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu principal */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className="border-0 shadow-lg bg-card hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/dashboard/nueva-verificacion")}
        >
          <CardHeader className="pb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl text-card-foreground">Iniciar Nueva Verificación</CardTitle>
            <CardDescription>Comienza el proceso de verificación para un nuevo lote de BIOFLEX</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full group-hover:bg-primary/90" size="lg">
              Comenzar
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-lg bg-card hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/dashboard/pendientes")}
        >
          <CardHeader className="pb-4">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
              <ClipboardList className="w-7 h-7 text-warning" />
            </div>
            <CardTitle className="text-xl text-card-foreground">Ver Verificaciones Pendientes</CardTitle>
            <CardDescription>Revisa y continúa con las verificaciones en proceso</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" size="lg">
              Ver Pendientes
              {pendingCount > 0 && (
                <span className="ml-2 bg-warning text-warning-foreground text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
