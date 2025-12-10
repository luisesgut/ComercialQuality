"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVerifications, type Verification } from "@/lib/verification-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Box,
  Tag,
  Lock,
  FileText,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react"



interface VerificationDetailProps {
  verificationId: string
}

const checkpointLabels = {
  packaging: { label: "Empaquetado", icon: Box, description: "Verificar integridad del empaque" },
  labeling: { label: "Etiquetado", icon: Tag, description: "Revisar información de etiquetas" },
  sealing: { label: "Sellado", icon: Lock, description: "Comprobar sellado hermético" },
  documentation: { label: "Documentación", icon: FileText, description: "Validar documentos adjuntos" },
}

export function VerificationDetail({ verificationId }: VerificationDetailProps) {
  const router = useRouter()
  const { getVerificationById, updateVerification, fetchVerifications, isLoading } = useVerifications()
  const verification = getVerificationById(verificationId)

  const [checkpoints, setCheckpoints] = useState({
    packaging: null as boolean | null,
    labeling: null as boolean | null,
    sealing: null as boolean | null,
    documentation: null as boolean | null,
  })
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVerifications()
  }, [])

  useEffect(() => {
    if (verification) {
      setCheckpoints(verification.checkpoints)
      setNotes(verification.notes || "")
    }
  }, [verification])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando verificación...</p>
        </div>
      </div>
    )
  }

  if (!verification) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4">Verificación no encontrada</p>
        <Button onClick={() => router.push("/dashboard")}>Volver al Dashboard</Button>
      </div>
    )
  }

  const handleCheckpoint = (key: keyof typeof checkpoints, value: boolean) => {
    setCheckpoints((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const allChecked = Object.values(checkpoints).every((v) => v !== null)
    const allPassed = Object.values(checkpoints).every((v) => v === true)

    let newStatus: Verification["status"] = "in-progress"
    if (allChecked) {
      newStatus = allPassed ? "completed" : "rejected"
    }

    try {
      const success = await updateVerification(verificationId, {
        checkpoints,
        notes,
        status: newStatus,
      })

      if (success) {
        if (newStatus === "completed" || newStatus === "rejected") {
          router.push("/dashboard/pendientes")
        }
      } else {
        setError("No se pudo guardar la verificación. Intente nuevamente.")
      }
    } catch (err) {
      setError("Error de conexión con el servidor.")
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const getProgressPercentage = () => {
    const total = Object.keys(checkpoints).length
    const completed = Object.values(checkpoints).filter((v) => v !== null).length
    return Math.round((completed / total) * 100)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/pendientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">Verificación de Lote</h2>
          <p className="text-muted-foreground">{verification.lotNumber}</p>
        </div>
        <Badge variant={verification.status === "completed" ? "secondary" : "outline"} className="gap-1">
          {verification.status === "pending" && <Clock className="w-3 h-3" />}
          {verification.status === "in-progress" && <Clock className="w-3 h-3" />}
          {verification.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
          {verification.status === "rejected" && <XCircle className="w-3 h-3" />}
          {verification.status === "pending" && "Pendiente"}
          {verification.status === "in-progress" && "En Progreso"}
          {verification.status === "completed" && "Completada"}
          {verification.status === "rejected" && "Rechazada"}
        </Badge>
      </div>

      {/* Info del producto */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-card-foreground">{verification.productName}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Vence: {formatDate(verification.expirationDate)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {verification.inspector}
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progreso de verificación</span>
              <span className="font-medium text-foreground">{getProgressPercentage()}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkpoints */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-card-foreground">Puntos de Verificación</CardTitle>
          <CardDescription>Marque cada punto como aprobado o rechazado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            Object.entries(checkpointLabels) as [
              keyof typeof checkpoints,
              (typeof checkpointLabels)[keyof typeof checkpointLabels],
            ][]
          ).map(([key, config]) => {
            const Icon = config.icon
            const value = checkpoints[key]

            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={value === true ? "default" : "outline"}
                    className={value === true ? "bg-success hover:bg-success/90 text-success-foreground" : ""}
                    onClick={() => handleCheckpoint(key, true)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={value === false ? "default" : "outline"}
                    className={
                      value === false ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""
                    }
                    onClick={() => handleCheckpoint(key, false)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-card-foreground">Notas y Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Agregue observaciones adicionales sobre la verificación..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-4 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-4 pb-8">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => router.push("/dashboard/pendientes")}
        >
          Cancelar
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Verificación
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
