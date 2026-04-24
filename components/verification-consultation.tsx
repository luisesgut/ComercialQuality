"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type {
  DashboardData,
  VerificationLookupCaja,
  VerificationLookupTarimaColaborador,
  VerificationLookupResponse,
  VerificationLookupTarimaAbierta,
  VerificationLookupTarimaTerminada,
} from "@/app/types/verification-types"
import { classifyApiError, formatApiError } from "@/lib/api-error"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, ExternalLink, Grid, HelpCircle, Layers, Loader2, Package, QrCode, Search, Truck } from "lucide-react"

const API_BASE_URL = "http://172.16.10.31/api"

type ConsultationMode = "bioflex" | "destiny" | "quality"
type ScanTarget = "bioflexCode" | "destinyItemNo" | "qualityLot" | "qualityItem"

function formatDateTime(value?: string | null) {
  if (!value) return "Sin registro"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatCount(value?: number | null) {
  return Number(value ?? 0).toLocaleString("es-MX")
}

function buildEvidenceUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${new URL(API_BASE_URL).origin}${normalizedPath}`
}

function getOpenTarimaBoxesCount(tarima: VerificationLookupTarimaAbierta) {
  if (Array.isArray(tarima.cajas)) return tarima.cajas.length
  if (typeof tarima.cajasEscaneadas === "number") return tarima.cajasEscaneadas
  if (typeof tarima.cajasLlevamos === "number") return tarima.cajasLlevamos
  return 0
}

function getOpenTarimaBoxesGoal(tarima: VerificationLookupTarimaAbierta) {
  if (typeof tarima.cajasMeta === "number") return tarima.cajasMeta
  if (typeof tarima.meta === "number") return tarima.meta
  return null
}

function getCajaUsuarioLabel(caja: VerificationLookupCaja) {
  return caja.usuarioValidador?.trim() || null
}

function appendUniqueName(target: string[], value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return
  if (!target.includes(normalized)) {
    target.push(normalized)
  }
}

function getTarimaReviewerNames(
  tarima:
    | VerificationLookupTarimaAbierta
    | VerificationLookupTarimaTerminada
    | (VerificationLookupTarimaAbierta & VerificationLookupTarimaTerminada),
) {
  const reviewers: string[] = []

  appendUniqueName(reviewers, tarima.usuarioReviso)
  appendUniqueName(reviewers, tarima.usuarioRevision)
  appendUniqueName(reviewers, tarima.revisadoPor)
  appendUniqueName(reviewers, tarima.revisor)

  if ("usuarioCerro" in tarima) {
    appendUniqueName(reviewers, tarima.usuarioCerro)
  }

  if ("colaboradores" in tarima && Array.isArray(tarima.colaboradores)) {
    tarima.colaboradores.forEach((colaborador: VerificationLookupTarimaColaborador) => {
      appendUniqueName(reviewers, colaborador.usuario ?? colaborador.nombre ?? null)
    })
  }

  appendUniqueName(reviewers, tarima.usuario)

  return reviewers
}

function getTarimaReviewerLabel(
  tarima:
    | VerificationLookupTarimaAbierta
    | VerificationLookupTarimaTerminada
    | (VerificationLookupTarimaAbierta & VerificationLookupTarimaTerminada),
) {
  const reviewers = getTarimaReviewerNames(tarima)
  if (!reviewers.length) return null
  return reviewers.join(", ")
}

function getClosedTarimasSummary(tarimas: VerificationLookupTarimaTerminada[]) {
  const usuarios = new Set<string>()
  let totalCajas = 0
  let totalPiezasAuditadas = 0
  let totalCajasConDefectos = 0
  let ultimoCierre: string | null = null
  let ultimoCierreTime = Number.NEGATIVE_INFINITY

  tarimas.forEach((tarima) => {
    totalCajas += tarima.cajasRegistradas ?? 0

    getTarimaReviewerNames(tarima).forEach((usuario) => usuarios.add(usuario))

    tarima.cajas.forEach((caja) => {
      totalPiezasAuditadas += caja.piezasAuditadas ?? 0
      if (caja.tieneDefectos) {
        totalCajasConDefectos += 1
      }
    })

    if (tarima.fechaCierre) {
      const cierreTime = new Date(tarima.fechaCierre).getTime()
      if (!Number.isNaN(cierreTime) && cierreTime > ultimoCierreTime) {
        ultimoCierreTime = cierreTime
        ultimoCierre = tarima.fechaCierre
      }
    }
  })

  return {
    totalCajas,
    totalPiezasAuditadas,
    totalCajasConDefectos,
    usuariosCount: usuarios.size,
    ultimoCierre,
  }
}

function CajaCard({ caja }: { caja: VerificationLookupCaja }) {
  const usuarioCaja = getCajaUsuarioLabel(caja)

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-card-foreground">{caja.identificador}</p>
          <p className="text-xs text-muted-foreground">
            {formatCount(caja.cantidad)} pz / {formatCount(caja.piezasAuditadas)} auditadas
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(caja.horaEscaneo)}</p>
          {usuarioCaja && (
            <p className="text-xs text-muted-foreground">Agregada por: {usuarioCaja}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {caja.tieneDefectos ? (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
              Con defectos
            </Badge>
          ) : (
            <Badge variant="outline">Sin defectos</Badge>
          )}
        </div>
      </div>

      {caja.comentarios && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {caja.comentarios}
        </div>
      )}

      {Array.isArray(caja.defectos) && caja.defectos.length > 0 && (
        <div className="space-y-2 rounded-md border border-destructive/15 bg-destructive/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Defectos</p>
          <div className="space-y-2">
            {caja.defectos.map((defecto, index) => (
              <div key={`${caja.detalleId}-defecto-${index}`} className="rounded-md bg-background px-3 py-2 text-xs">
                <p className="font-medium text-foreground">{defecto.detalle}</p>
                <p className="text-muted-foreground">
                  {defecto.familia} / {formatCount(defecto.cantidad)} piezas
                </p>
                {defecto.comentario && (
                  <p className="mt-1 text-muted-foreground">{defecto.comentario}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(caja.fotos) && caja.fotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidencias</p>
          <div className="flex flex-wrap gap-2">
            {caja.fotos.map((foto, index) => (
              <Button key={`${caja.detalleId}-foto-${index}`} variant="outline" size="sm" asChild>
                <a href={buildEvidenceUrl(foto)} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Foto {index + 1}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TarimaTerminadaAccordion({ tarimas }: { tarimas: VerificationLookupTarimaTerminada[] }) {
  if (!tarimas.length) {
    return <p className="text-sm text-muted-foreground">No hay tarimas terminadas registradas.</p>
  }

  return (
    <Accordion type="multiple" className="w-full">
      {tarimas.map((tarima) => {
        const reviewerLabel = getTarimaReviewerLabel(tarima)

        return (
          <AccordionItem key={tarima.tarimaId} value={`terminada-${tarima.tarimaId}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pr-4">
                <div className="space-y-1 text-left">
                  <p className="text-sm font-semibold text-card-foreground">Tarima #{tarima.numeroTarima}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCount(tarima.cajasRegistradas)} cajas / {formatDateTime(tarima.fechaCierre)}
                  </p>
                  {reviewerLabel && (
                    <p className="text-xs text-muted-foreground">Reviso: {reviewerLabel}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tarima.estatusCierre && <Badge variant="outline">{tarima.estatusCierre}</Badge>}
                  {reviewerLabel && <Badge variant="secondary">Reviso: {reviewerLabel}</Badge>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {tarima.comentarioCierre && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {tarima.comentarioCierre}
                </div>
              )}
              <div className="space-y-3">
                {tarima.cajas.map((caja) => (
                  <CajaCard key={caja.detalleId} caja={caja} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function TarimaAbiertaAccordion({ tarimas }: { tarimas: VerificationLookupTarimaAbierta[] }) {
  if (!tarimas.length) {
    return <p className="text-sm text-muted-foreground">No hay tarimas abiertas actualmente.</p>
  }

  return (
    <Accordion type="multiple" className="w-full">
      {tarimas.map((tarima) => {
        const cajasCount = getOpenTarimaBoxesCount(tarima)
        const cajasGoal = getOpenTarimaBoxesGoal(tarima)
        const reviewerLabel = getTarimaReviewerLabel(tarima)
        const creatorLabel = tarima.usuarioCreo?.trim() || null

        return (
          <AccordionItem key={tarima.tarimaId} value={`abierta-${tarima.tarimaId}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pr-4">
                <div className="space-y-1 text-left">
                  <p className="text-sm font-semibold text-card-foreground">Tarima #{tarima.numeroTarima}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCount(cajasCount)} cajas
                    {typeof cajasGoal === "number" ? ` / ${formatCount(cajasGoal)}` : ""}
                    {tarima.fechaInicio ? ` / ${formatDateTime(tarima.fechaInicio)}` : ""}
                  </p>
                  {reviewerLabel && (
                    <p className="text-xs text-muted-foreground">Reviso: {reviewerLabel}</p>
                  )}
                  {creatorLabel && (
                    <p className="text-xs text-muted-foreground">Creo: {creatorLabel}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tarima.estado && <Badge variant="outline">{tarima.estado}</Badge>}
                  {reviewerLabel && <Badge variant="secondary">Reviso: {reviewerLabel}</Badge>}
                  {creatorLabel && <Badge variant="outline">Creo: {creatorLabel}</Badge>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {Array.isArray(tarima.cajas) && tarima.cajas.length > 0 ? (
                <div className="space-y-3">
                  {tarima.cajas.map((caja) => (
                    <CajaCard key={caja.detalleId} caja={caja} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">El backend no devolvio detalle de cajas para esta tarima abierta.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function DashboardSummary({ dashboard, terminada }: { dashboard: DashboardData; terminada: boolean }) {
  const printCard = dashboard.printCard?.trim() ?? ""

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={terminada ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : undefined}>
                  {dashboard.estado}
                </Badge>
                <Badge variant="outline">Verificacion #{dashboard.verificacionId}</Badge>
                <Badge variant="secondary">{dashboard.cliente}</Badge>
              </div>
              <h2 className="text-xl font-bold text-card-foreground">
                {dashboard.nombreProducto ?? dashboard.productoInfo ?? "Producto sin descripcion"}
              </h2>
              {dashboard.claveProducto && (
                <p className="text-sm text-muted-foreground">Clave: {dashboard.claveProducto}</p>
              )}
            </div>

            {printCard && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`${API_BASE_URL}/Printcard/${encodeURIComponent(printCard)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    PrintCard
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`${API_BASE_URL}/Printcard/ficha/${encodeURIComponent(printCard)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ficha tecnica
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lote</p>
              <p className="mt-1 text-lg font-semibold text-card-foreground">{dashboard.loteOrden}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Piezas meta</p>
              <p className="mt-1 text-lg font-semibold text-card-foreground">{formatCount(dashboard.piezasMeta)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Piezas por caja</p>
              <p className="mt-1 text-lg font-semibold text-card-foreground">{formatCount(dashboard.piezasPorCaja)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avance</p>
              <p className="mt-1 text-lg font-semibold text-card-foreground">{dashboard.porcentajeAvance}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-5 text-center">
            <Package className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-card-foreground">{formatCount(dashboard.cajasActuales)}</p>
            <p className="text-sm text-muted-foreground">Cajas registradas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-5 text-center">
            <Truck className="mx-auto mb-2 h-5 w-5 text-orange-500" />
            <p className="text-2xl font-bold text-card-foreground">
              {formatCount(dashboard.tarimasActuales)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {formatCount(dashboard.tarimasTotalesEstimadas)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Tarimas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-5 text-center">
            <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold text-card-foreground">{formatCount(dashboard.tiempoTranscurridoMinutos)}</p>
            <p className="text-sm text-muted-foreground">Minutos transcurridos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClosedTarimasSummary({
  tarimas,
  dashboard,
  showNoOpenBadge,
}: {
  tarimas: VerificationLookupTarimaTerminada[]
  dashboard: DashboardData
  showNoOpenBadge: boolean
}) {
  const { totalCajas, totalPiezasAuditadas, totalCajasConDefectos, usuariosCount, ultimoCierre } =
    getClosedTarimasSummary(tarimas)
  const targetTarimas = Math.max(dashboard.tarimasTotalesEstimadas, dashboard.tarimasActuales, tarimas.length)
  const completionValue = targetTarimas > 0 ? Math.min((tarimas.length / targetTarimas) * 100, 100) : 0

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resumen de cerradas
            </Badge>
            {showNoOpenBadge && (
              <Badge variant="outline" className="text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                Sin tarimas abiertas
              </Badge>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-card-foreground">
              {formatCount(tarimas.length)} tarimas ya cerradas
            </p>
            <p className="text-sm text-muted-foreground">
              Historial acumulado de cajas, piezas auditadas y ultimo cierre registrado.
            </p>
          </div>
        </div>

        <div className="min-w-full space-y-2 lg:min-w-72">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Cierre acumulado</span>
            <span>
              {formatCount(tarimas.length)} / {formatCount(targetTarimas)} tarimas
            </span>
          </div>
          <Progress value={completionValue} className="h-2 bg-primary/10" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-background/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cajas cerradas</p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">{formatCount(totalCajas)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Piezas auditadas</p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">{formatCount(totalPiezasAuditadas)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cajas con defectos</p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">{formatCount(totalCajasConDefectos)}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimo cierre</p>
          <p className="mt-1 text-sm font-semibold text-card-foreground">{formatDateTime(ultimoCierre)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCount(usuariosCount)} revisor{usuariosCount === 1 ? "" : "es"} participaron
          </p>
        </div>
      </div>
    </div>
  )
}

export function VerificationConsultation() {
  const router = useRouter()

  const [mode, setMode] = useState<ConsultationMode>("bioflex")
  const [codigoInsumo, setCodigoInsumo] = useState("")
  const [destinyItemNo, setDestinyItemNo] = useState("")
  const [destinyInventoryLot, setDestinyInventoryLot] = useState("")
  const [qualityPO2, setQualityPO2] = useState("")
  const [qualityItemNo, setQualityItemNo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerificationLookupResponse | null>(null)
  const [helpImage, setHelpImage] = useState<null | { title: string; src: string; alt: string }>(null)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null)
  const [scannerFormats, setScannerFormats] = useState<string[]>(["qr_code"])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerStreamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)

  const handleModeChange = (nextMode: ConsultationMode) => {
    setMode(nextMode)
    setError(null)
    setResult(null)
    stopScanner()
  }

  const stopScanner = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop())
      scannerStreamRef.current = null
    }
    setIsScannerActive(false)
    setIsVideoReady(false)
    setScanTarget(null)
  }

  const startScanner = async (target: ScanTarget, formats: string[]) => {
    setScannerError(null)
    setIsVideoReady(false)
    if (isScannerActive) {
      stopScanner()
    }

    const BarcodeDetectorRef: any = (window as any).BarcodeDetector
    if (!BarcodeDetectorRef) {
      setScannerError("Tu navegador no soporta la detección de códigos nativa. Usa Chrome en Android/Desktop.")
      return
    }

    try {
      let supportedFormats = formats
      if (typeof BarcodeDetectorRef.getSupportedFormats === "function") {
        const availableFormats = await BarcodeDetectorRef.getSupportedFormats()
        supportedFormats = formats.filter((format) => availableFormats.includes(format))
      }

      if (!supportedFormats.length) {
        setScannerError("Tu navegador no soporta los formatos de código requeridos.")
        return
      }

      setScanTarget(target)
      setScannerFormats(supportedFormats)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      scannerStreamRef.current = stream
      setIsScannerActive(true)
    } catch (scannerStartError: any) {
      console.error("Error iniciando scanner:", scannerStartError)
      setScannerError(scannerStartError?.message || "No se pudo acceder a la cámara.")
      stopScanner()
    }
  }

  useEffect(() => {
    if (!isScannerActive || !scannerStreamRef.current || !videoRef.current) return

    const video = videoRef.current
    const stream = scannerStreamRef.current
    video.srcObject = stream

    const BarcodeDetectorRef: any = (window as any).BarcodeDetector
    const detector = new BarcodeDetectorRef({ formats: scannerFormats })

    const onCanPlay = async () => {
      try {
        await video.play()
        setIsVideoReady(true)

        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return

          try {
            const barcodes = await detector.detect(video)
            if (barcodes.length > 0) {
              const codeValue = barcodes[0].rawValue

              if (scanTarget === "destinyItemNo") {
                setDestinyItemNo(codeValue)
                stopScanner()
                return
              }

              if (scanTarget === "qualityLot") {
                if (/^\d{6}$/.test(codeValue)) {
                  setQualityPO2(codeValue)
                  stopScanner()
                  return
                }
                setScannerError("QR inválido para Lot Number. Debe ser numérico de 6 dígitos.")
              } else if (scanTarget === "qualityItem") {
                if (/^P/i.test(codeValue)) {
                  setQualityItemNo(codeValue)
                  stopScanner()
                  return
                }
                setScannerError("QR inválido para Item Number. Debe iniciar con P.")
              } else {
                setCodigoInsumo(codeValue)
                stopScanner()
                return
              }
            }
          } catch {
            // Ignora errores puntuales de detección para mantener el escaneo activo.
          }

          scanLoopRef.current = requestAnimationFrame(scanLoop)
        }

        scanLoopRef.current = requestAnimationFrame(scanLoop)
      } catch (videoError) {
        console.error("Error al reproducir video:", videoError)
      }
    }

    video.addEventListener("canplay", onCanPlay, { once: true })

    return () => {
      video.removeEventListener("canplay", onCanPlay)
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current)
    }
  }, [isScannerActive, scanTarget, scannerFormats])

  useEffect(() => {
    return () => stopScanner()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setResult(null)

    let payload: Record<string, string>
    let context: string

    if (mode === "bioflex") {
      const normalizedCodigoInsumo = codigoInsumo.trim()
      if (!normalizedCodigoInsumo) {
        setError("Capture el codigo de insumo para Bioflex.")
        return
      }

      payload = {
        tipoCliente: "Bioflex",
        codigoInsumo: normalizedCodigoInsumo,
      }
      context = `Bioflex ${normalizedCodigoInsumo}`
    } else if (mode === "destiny") {
      const normalizedItemNo = destinyItemNo.trim()
      const normalizedInventoryLot = destinyInventoryLot.trim()

      if (!normalizedItemNo || !normalizedInventoryLot) {
        setError("Capture ItemNo e InventoryLot para Destiny.")
        return
      }

      payload = {
        tipoCliente: "Destiny",
        itemNo: normalizedItemNo,
        inventoryLot: normalizedInventoryLot,
      }
      context = `Destiny ${normalizedItemNo} / ${normalizedInventoryLot}`
    } else {
      const normalizedPO2 = qualityPO2.trim()
      const normalizedItemNo = qualityItemNo.trim()

      if (!normalizedPO2 || !normalizedItemNo) {
        setError("Capture U_PO2 y U_ItemNo para Quality.")
        return
      }

      payload = {
        tipoCliente: "Quality",
        u_PO2: normalizedPO2,
        u_ItemNo: normalizedItemNo,
      }
      context = `Quality ${normalizedPO2} / ${normalizedItemNo}`
    }

    setIsLoading(true)

    try {
      let response: Response

      try {
        response = await fetch(`${API_BASE_URL}/Verificacion/buscar-por-datos`, {
          method: "POST",
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      } catch (networkError) {
        throw formatApiError(classifyApiError(networkError, undefined, context))
      }

      if (!response.ok) {
        let detail = formatApiError(classifyApiError(new Error(`HTTP ${response.status}`), response.status, context))

        try {
          const rawText = await response.text()
          if (rawText) {
            try {
              const parsed = JSON.parse(rawText)
              detail = parsed.detail || parsed.message || parsed.error || detail
            } catch {
              detail = rawText
            }
          }
        } catch {
          // Preserve default detail
        }

        throw new Error(detail)
      }

      const data = (await response.json()) as VerificationLookupResponse
      setResult({
        ...data,
        dashboard: data.dashboard ?? null,
        tarimasTerminadas: Array.isArray(data.tarimasTerminadas) ? data.tarimasTerminadas : [],
        tarimasAbiertas: Array.isArray(data.tarimasAbiertas) ? data.tarimasAbiertas : [],
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo consultar la verificacion.")
    } finally {
      setIsLoading(false)
    }
  }

  const helpModal = helpImage ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl space-y-4 rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold">{helpImage.title}</h3>
          <Button variant="ghost" size="icon" onClick={() => setHelpImage(null)}>
            &times;
          </Button>
        </div>
        <div className="flex justify-center">
          <img
            src={helpImage.src}
            alt={helpImage.alt}
            className="max-h-[70vh] w-auto rounded-md border"
          />
        </div>
      </div>
    </div>
  ) : null

  const renderScannerControls = (
    target: ScanTarget,
    formats: string[],
    idleLabel: string,
    readyLabel: string,
  ) => (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          if (isScannerActive && scanTarget === target) {
            stopScanner()
          } else {
            startScanner(target, formats)
          }
        }}
        disabled={isLoading}
      >
        <QrCode className="w-5 h-5 mr-2" />
        {isScannerActive && scanTarget === target ? "Detener escaneo" : idleLabel}
      </Button>
      {scannerError && scanTarget === target && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {scannerError}
        </p>
      )}
      {isScannerActive && scanTarget === target && (
        <div className="mt-2 rounded-lg border bg-black/70 p-2 flex flex-col items-center gap-2">
          <video
            ref={videoRef}
            className="w-full rounded-md aspect-video object-cover"
            autoPlay
            playsInline
            muted
            style={{ backgroundColor: "#000" }}
          />
          <p className="text-xs text-muted-foreground">
            {isVideoReady ? readyLabel : "Cargando cámara..."}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Consultar verificacion</h2>
          <p className="text-muted-foreground">Elija el flujo y capture los mismos datos del alta.</p>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Grid className="w-4 h-4" />
            Seleccione el tipo de verificación
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button type="button" variant={mode === "bioflex" ? "default" : "outline"} onClick={() => handleModeChange("bioflex")} className="w-full">
              Bioflex
            </Button>
            <Button type="button" variant={mode === "destiny" ? "default" : "outline"} onClick={() => handleModeChange("destiny")} className="w-full">
              Destiny
            </Button>
            <Button type="button" variant={mode === "quality" ? "default" : "outline"} onClick={() => handleModeChange("quality")} className="w-full">
              Quality
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mx-auto max-w-2xl">
        {mode === "bioflex" && (
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-card-foreground">Bioflex</CardTitle>
              <CardDescription>Ingresa el código o escanea el QR.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bioflex-codigo-insumo" className="text-card-foreground">
                    Código de Trazabilidad
                  </Label>
                  <Input
                    id="bioflex-codigo-insumo"
                    inputMode="numeric"
                    value={codigoInsumo}
                    onChange={(event) => setCodigoInsumo(event.target.value)}
                    placeholder="Ej: 604025132030"
                    className="pl-4 h-12 text-lg text-center font-mono"
                    disabled={isLoading}
                    required
                  />
                  {renderScannerControls(
                    "bioflexCode",
                    ["qr_code"],
                    "Escanear QR con cámara",
                    "Apunte al código QR para capturar la trazabilidad.",
                  )}
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading || !codigoInsumo.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Consultar verificacion
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "destiny" && (
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">Datos Destiny</CardTitle>
              <CardDescription>ItemNo e InventoryLot</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="destiny-item-no">ItemNo</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setHelpImage({
                          title: "Guia ItemNo",
                          src: "/guia-ItemNo.jpg",
                          alt: "Guia para encontrar ItemNo",
                        })
                      }
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    id="destiny-item-no"
                    value={destinyItemNo}
                    onChange={(event) => setDestinyItemNo(event.target.value)}
                    placeholder="Ej. 61953-11"
                    disabled={isLoading}
                  />
                  {renderScannerControls(
                    "destinyItemNo",
                    ["code_128", "code_39", "code_93", "ean_13", "ean_8", "itf", "upc_a", "upc_e", "codabar", "qr_code"],
                    "Escanear código de barras",
                    "Apunte al código de barras para capturar el ItemNo.",
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="destiny-inventory-lot">InventoryLot</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setHelpImage({
                          title: "Guia InventoryLot",
                          src: "/guia-Inventorylot.jpg",
                          alt: "Guia para encontrar InventoryLot",
                        })
                      }
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    id="destiny-inventory-lot"
                    inputMode="numeric"
                    value={destinyInventoryLot}
                    onChange={(event) => setDestinyInventoryLot(event.target.value)}
                    placeholder="Ej. 13915"
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                  {isLoading ? "Consultando..." : "Consultar verificacion Destiny"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "quality" && (
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">Datos Quality</CardTitle>
              <CardDescription>Ingrese Lot Number e Item Number para buscar datos.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quality-po2">Lot Number</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setHelpImage({
                          title: "Guia Lot Number",
                          src: "/lotNumber.jpg",
                          alt: "Guia para encontrar Lot Number",
                        })
                      }
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    id="quality-po2"
                    inputMode="numeric"
                    value={qualityPO2}
                    onChange={(event) => setQualityPO2(event.target.value)}
                    placeholder="Ej. 184335"
                    disabled={isLoading}
                  />
                  {renderScannerControls(
                    "qualityLot",
                    ["qr_code"],
                    "Escanear QR con cámara",
                    "Apunte al QR para capturar el Lot Number (6 dígitos).",
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quality-item-no">Item Number</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setHelpImage({
                          title: "Guia Item Number",
                          src: "/itemNumber.jpg",
                          alt: "Guia para encontrar Item Number",
                        })
                      }
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    id="quality-item-no"
                    value={qualityItemNo}
                    onChange={(event) => setQualityItemNo(event.target.value)}
                    placeholder="Ej. P101212"
                    disabled={isLoading}
                  />
                  {renderScannerControls(
                    "qualityItem",
                    ["qr_code"],
                    "Escanear QR con cámara",
                    "Apunte al QR para capturar el Item Number (inicia con P).",
                  )}
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                  {isLoading ? "Consultando..." : "Consultar verificacion Quality"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && !result.existe && (
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">No existe una verificacion previa para esos datos.</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.loteResuelto
                    ? `Lote resuelto por el backend: ${result.loteResuelto}.`
                    : "Puede iniciar una verificacion nueva desde el modulo de alta."}
                </p>
              </div>
              <Button onClick={() => router.push("/dashboard/nueva-verificacion")}>Ir a nueva verificacion</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.existe && !result.dashboard && (
        <Card className="border-0 shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 text-sm text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                La verificacion existe, pero el backend no devolvio el resumen del dashboard.
                {result.verificacionId ? ` ID detectado: ${result.verificacionId}.` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.existe && result.dashboard && (
        <div className="space-y-6">
          <DashboardSummary dashboard={result.dashboard} terminada={result.terminada} />

          {(() => {
            const tarimasAbiertas = result.tarimasAbiertas ?? []
            const tarimasTerminadas = result.tarimasTerminadas ?? []
            const hasOpenTarimas = tarimasAbiertas.length > 0

            return (
              <div className={cn("grid gap-6", hasOpenTarimas && "xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]")}>
                {hasOpenTarimas ? (
                  <Card className="border-0 shadow-md bg-card">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-orange-500" />
                          <CardTitle>Tarimas abiertas</CardTitle>
                        </div>
                        <Badge variant="outline">{tarimasAbiertas.length}</Badge>
                      </div>
                      <CardDescription>Tarimas que siguen activas al momento de la consulta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TarimaAbiertaAccordion tarimas={tarimasAbiertas} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    <Truck className="h-4 w-4 text-orange-500" />
                    No hay tarimas abiertas actualmente.
                  </div>
                )}

                <Card className={cn("border-0 bg-card shadow-md", !hasOpenTarimas && "shadow-lg ring-1 ring-primary/10")}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle>Tarimas terminadas</CardTitle>
                      </div>
                      <Badge variant="outline">{tarimasTerminadas.length}</Badge>
                    </div>
                    <CardDescription>Detalle historico de las tarimas cerradas y sus cajas.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ClosedTarimasSummary
                      tarimas={tarimasTerminadas}
                      dashboard={result.dashboard}
                      showNoOpenBadge={!hasOpenTarimas}
                    />
                    <TarimaTerminadaAccordion tarimas={tarimasTerminadas} />
                  </CardContent>
                </Card>
              </div>
            )
          })()}
        </div>
      )}
      {helpModal}
    </div>
  )
}
