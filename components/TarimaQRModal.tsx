"use client"

import { useState } from "react"
import { useTarimaDetail } from "@/hooks/useTarimaDetail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  X,
  Search,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Trash2,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"

interface TarimaQRModalProps {
  onClose: () => void
  onUpdated?: () => void
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TarimaQRModal({ onClose, onUpdated }: TarimaQRModalProps) {
  const [tarimaIdInput, setTarimaIdInput] = useState("")
  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const { tarima, isLoading, isSubmitting, error, fetchTarima, reabrirTarima, eliminarCaja } =
    useTarimaDetail()

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    const id = Number(tarimaIdInput)
    if (!id || id <= 0) return
    setActionSuccess(null)
    fetchTarima(id)
  }

  const handleReabrir = async () => {
    if (!tarima) return
    const ok = await reabrirTarima(tarima.tarimaId)
    if (ok) {
      setActionSuccess("Tarima reabierta correctamente.")
      onUpdated?.()
    }
  }

  const handleEliminarCaja = async (detalleId: number) => {
    if (!tarima) return
    setConfirmDeleteId(null)
    const ok = await eliminarCaja(detalleId, tarima.tarimaId)
    if (ok) {
      setActionSuccess("Caja eliminada y contadores actualizados.")
      onUpdated?.()
    }
  }

  const progress =
    tarima && tarima.cajasMeta > 0
      ? Math.min(100, (tarima.cajasEscaneadas / tarima.cajasMeta) * 100)
      : 0

  const getCajaUsuarioLabel = (caja: NonNullable<typeof tarima>["cajas"][number]) =>
    caja.usuarioValidador?.trim() ||
    caja.usuario?.trim() ||
    caja.Usuario?.trim() ||
    caja.usuarioRegistro?.trim() ||
    caja.usuarioAgrego?.trim() ||
    caja.agregadoPor?.trim() ||
    null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Gestionar Tarima por QR
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

            {/* Búsqueda */}
            <form onSubmit={handleBuscar} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="tarimaId" className="text-sm font-medium">ID de Tarima</Label>
                <Input
                  id="tarimaId"
                  type="number"
                  inputMode="numeric"
                  className="h-12 text-base"
                  placeholder="Ej. 35"
                  value={tarimaIdInput}
                  onChange={(e) => setTarimaIdInput(e.target.value)}
                  disabled={isLoading || isSubmitting}
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="h-12 px-4" disabled={isLoading || isSubmitting || !tarimaIdInput}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </form>

            {/* Error global */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Éxito de acción */}
            {actionSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {actionSuccess}
              </div>
            )}

            {/* Cargando */}
            {isLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Buscando tarima...</span>
              </div>
            )}

            {/* Detalle de tarima */}
            {tarima && !isLoading && (
              <div className="space-y-4">

                {/* Info principal + estado */}
                <div className="rounded-xl border-2 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Tarima</p>
                      <p className="text-4xl font-black leading-none">#{tarima.numeroTarima}</p>
                      <p className="text-xs text-muted-foreground mt-1">ID: {tarima.tarimaId} · Verif. #{tarima.verificacionId}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      tarima.estado === "ABIERTA"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {tarima.estado === "ABIERTA"
                        ? <Unlock className="w-3 h-3" />
                        : <Lock className="w-3 h-3" />
                      }
                      {tarima.estado}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>{tarima.cajasEscaneadas} / {tarima.cajasMeta} cajas</span>
                      <span className="text-primary font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <span>{tarima.usuarioCreo}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatFecha(tarima.fechaInicio)}</span>
                    </div>
                    {tarima.fechaCierre && (
                      <div className="flex items-center gap-1 col-span-2">
                        <Lock className="w-3 h-3" />
                        <span>Cerrada: {formatFecha(tarima.fechaCierre)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acción: reabrir (si está cerrada) */}
                {tarima.estado === "CERRADA" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm text-amber-800 font-medium">
                      Esta tarima está cerrada. Para eliminar cajas primero debes reabrirla.
                    </p>
                    <Button
                      className="w-full h-12"
                      variant="outline"
                      onClick={() => setConfirmReabrirOpen(true)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reabriendo...</>
                        : <><Unlock className="w-4 h-4 mr-2" />Reabrir Tarima</>
                      }
                    </Button>
                  </div>
                )}

                {/* Lista de cajas */}
                {tarima.cajas.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Cajas registradas ({tarima.cajas.length})
                    </p>
                    <div className="divide-y divide-border rounded-xl border overflow-hidden">
                      {tarima.cajas.map((caja) => (
                        <div key={caja.detalleId} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{caja.identificador}</p>
                            <p className="text-xs text-muted-foreground">
                              {caja.cantidad != null ? `${caja.cantidad} pz` : ""}
                              {caja.piezasAuditadas != null ? ` · ${caja.piezasAuditadas} auditadas` : ""}
                              {caja.horaEscaneo ? ` · ${new Date(caja.horaEscaneo).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : ""}
                            </p>
                            {getCajaUsuarioLabel(caja) && (
                              <p className="text-xs text-muted-foreground">
                                Agregada por: {getCajaUsuarioLabel(caja)}
                              </p>
                            )}
                          </div>
                          {caja.tieneDefectos && (
                            <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full shrink-0">
                              Defecto
                            </span>
                          )}
                          {tarima.estado === "ABIERTA" && tarima.puedeEditar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => setConfirmDeleteId(caja.detalleId)}
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto opacity-25 mb-2" />
                    <p className="text-sm">Sin cajas registradas.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 shrink-0">
            <Button variant="outline" className="w-full h-12" onClick={onClose} disabled={isSubmitting}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog confirmar reabrir */}
      <AlertDialog open={confirmReabrirOpen} onOpenChange={setConfirmReabrirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reabrir tarima #{tarima?.numeroTarima}?</AlertDialogTitle>
            <AlertDialogDescription>
              La tarima volverá al estado ABIERTA y podrás eliminar cajas. Esta acción no se puede deshacer automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReabrir}>Sí, reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmar eliminar caja */}
      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la caja y se recalcularán todos los contadores automáticamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId !== null && handleEliminarCaja(confirmDeleteId)}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
