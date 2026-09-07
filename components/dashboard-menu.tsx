"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useVerifications, type Verification } from "@/lib/verification-context"
import {
  PlusCircle,
  ClipboardList,
  ArrowRight,
  ChevronRight,
  Loader2,
  AlertCircle,
  PlayCircle,
  ShieldAlert,
  Search,
  Package,
  Building2,
  Inbox,
  RefreshCw,
} from "lucide-react"

/** Cuántas verificaciones se listan en el panel antes de mandar al listado completo. */
const MAX_EN_COLA = 5

function formatHoraInicio(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

function formatTranscurrido(iso: string, now: number) {
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return null

  const minutos = Math.floor((now - start) / 60_000)
  if (minutos < 0) return null
  if (minutos < 1) return "hace unos segundos"
  if (minutos < 60) return `hace ${minutos} min`

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas < 24) return resto > 0 ? `hace ${horas} h ${resto} min` : `hace ${horas} h`

  const dias = Math.floor(horas / 24)
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`
}

function tiempoDeInicio(iso: string, now: number | null) {
  const hora = formatHoraInicio(iso)
  if (!hora) return null
  const transcurrido = now === null ? null : formatTranscurrido(iso, now)
  return transcurrido ? `Iniciada ${hora} · ${transcurrido}` : `Iniciada ${hora}`
}

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
} as const

export function DashboardMenu() {
  const router = useRouter()
  const { user } = useAuth()
  const { getPendingVerifications, isLoading, error, fetchVerifications } = useVerifications()
  const [todayLabel, setTodayLabel] = useState("")
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    fetchVerifications()
  }, [])

  useEffect(() => {
    const tick = () => {
      const formatter = new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      setTodayLabel(formatter.format(new Date()).toUpperCase())
      setNow(Date.now())
    }

    tick()
    const intervalId = window.setInterval(tick, 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const isAdmin = user?.role === "Administrador"

  // Cola de trabajo: primero lo que está en curso, después lo más antiguo sin iniciar.
  const cola = [...getPendingVerifications()].sort((a, b) => {
    if (a.status !== b.status) return a.status === "in-progress" ? -1 : 1
    return (new Date(a.createdAt).getTime() || 0) - (new Date(b.createdAt).getTime() || 0)
  })

  const enCurso = cola.filter((v) => v.status === "in-progress").length
  const sinIniciar = cola.length - enCurso
  const visibles = cola.slice(0, MAX_EN_COLA)
  const restantes = cola.length - visibles.length

  const herramientas = [
    {
      key: "consultar",
      icon: Search,
      tone: "accent" as const,
      title: "Consultar verificación",
      description: "Busca por lote, tarima o caja",
      href: "/dashboard/consultar-verificacion",
    },
    {
      key: "pendientes",
      icon: ClipboardList,
      tone: "warning" as const,
      title: "Ver pendientes",
      description: "Listado completo de verificaciones",
      href: "/dashboard/pendientes",
      badge: cola.length,
    },
    ...(isAdmin
      ? [
          {
            key: "defectos",
            icon: ShieldAlert,
            tone: "primary" as const,
            title: "Administrar defectos",
            description: "Alta, consulta y baja del catálogo",
            href: "/dashboard/catalogo-defectos",
            admin: true,
          },
        ]
      : []),
  ]

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

  const encabezado = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[26px] leading-8 font-extrabold tracking-tight text-foreground">
          {error
            ? "Panel de Control"
            : cola.length === 0
              ? "Sin verificaciones activas"
              : `${cola.length} ${cola.length === 1 ? "verificación activa" : "verificaciones activas"}`}
        </h2>
        {error ? (
          <p className="text-sm text-muted-foreground mt-1.5">No se pudo leer el estado de las verificaciones</p>
        ) : cola.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-1.5">No hay nada en proceso en este momento</p>
        ) : (
          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning" />
              {enCurso} en curso
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-border" />
              {sinIniciar} sin iniciar
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {todayLabel && (
          <div className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/40 px-3.5 py-2 text-xs font-semibold tracking-wide text-foreground">
            {todayLabel}
          </div>
        )}
        <button
          type="button"
          onClick={() => fetchVerifications()}
          title="Actualizar"
          aria-label="Actualizar"
          className="w-11 h-11 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <RefreshCw className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  )

  const accionPrimaria = (
    <button
      type="button"
      onClick={() => router.push("/dashboard/nueva-verificacion")}
      className="w-full h-[88px] rounded-xl bg-primary text-primary-foreground flex items-center gap-4 pl-[18px] pr-5 text-left shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="w-14 h-14 rounded-[14px] bg-primary-foreground/15 flex items-center justify-center shrink-0">
        <PlusCircle className="w-7 h-7" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[22px] leading-7 font-bold">Nueva Verificación</span>
        <span className="block text-sm text-primary-foreground/75">Registra un lote y comienza a escanear tarimas</span>
      </span>
      <span className="w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center shrink-0">
        <ArrowRight className="w-5 h-5" />
      </span>
    </button>
  )

  const tituloSeccion = (texto: string) => (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.07em] text-muted-foreground">{texto}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  )

  const seccionHerramientas = (
    <div className="space-y-3">
      {tituloSeccion("Herramientas")}
      <div className="flex flex-wrap gap-4">
        {herramientas.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex-1 basis-60 min-h-[88px] rounded-xl border border-border bg-card flex items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[item.tone]}`}>
                <Icon className="w-[22px] h-[22px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] leading-tight font-semibold text-card-foreground">{item.title}</span>
                  {"admin" in item && item.admin && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground border border-border rounded px-1.5 py-px">
                      Admin
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground mt-1">{item.description}</span>
              </span>
              {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                <span className="shrink-0 min-w-7 h-7 px-2 rounded-full bg-warning text-warning-foreground text-sm font-bold inline-flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="space-y-7">
        {encabezado}

        <div className="rounded-xl border border-destructive/35 bg-destructive/[0.07] p-[18px] flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-[22px] h-[22px] text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">No hay conexión con el servidor</h3>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">{error}</p>
            <Button variant="destructive" className="h-11 px-[18px] mt-3.5" onClick={() => fetchVerifications()}>
              <RefreshCw className="w-[17px] h-[17px]" />
              Reintentar
            </Button>
          </div>
        </div>

        {accionPrimaria}
        {seccionHerramientas}
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {encabezado}
      {accionPrimaria}

      <div className="space-y-3">
        {tituloSeccion("Tu cola de trabajo")}

        {cola.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-card/60 px-6 py-11 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="w-[30px] h-[30px] text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-[17px] font-semibold text-card-foreground">Tu cola de trabajo está vacía</p>
            <p className="text-sm text-muted-foreground text-center max-w-[340px] text-pretty">
              Las verificaciones que inicies o que otro turno deje abiertas aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            {visibles.map((verification) => (
              <QueueRow key={verification.id} verification={verification} now={now} router={router} />
            ))}

            <button
              type="button"
              onClick={() => router.push("/dashboard/pendientes")}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold text-primary rounded-md transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {restantes > 0
                ? `Ver las ${restantes} restantes en el listado completo`
                : "Ver el listado completo de pendientes"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {seccionHerramientas}
    </div>
  )
}

function QueueRow({
  verification,
  now,
  router,
}: {
  verification: Verification
  now: number | null
  router: ReturnType<typeof useRouter>
}) {
  const enCurso = verification.status === "in-progress"
  const producto = verification.producto || verification.productName
  const tarimas = verification.avanceTarimas ?? 0
  const inicio = tiempoDeInicio(verification.createdAt, now)

  const meta = (
    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
      {verification.lotNumber && (
        <span className="font-mono text-[13px] font-medium bg-muted border border-border rounded-md px-1.5 py-0.5">
          {verification.lotNumber}
        </span>
      )}
      {verification.cliente && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="w-3.5 h-3.5" />
          {verification.cliente}
        </span>
      )}
    </div>
  )

  if (!enCurso) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/dashboard/verificacion/${verification.id}`)}
        className="w-full rounded-xl border border-border bg-card px-[18px] py-4 flex items-center justify-between gap-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Sin iniciar
          </span>
          <p className="text-[17px] leading-snug font-semibold text-card-foreground mt-2.5">{producto}</p>
          {meta}
        </div>
        <span className="shrink-0 h-12 px-5 rounded-md border border-border bg-card text-base font-semibold inline-flex items-center gap-2">
          Iniciar
          <ArrowRight className="w-[18px] h-[18px]" />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/verificacion/${verification.id}`)}
      className="w-full rounded-xl border-2 border-warning bg-card px-[18px] py-4 flex flex-col gap-3.5 text-left transition-colors hover:bg-warning/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-warning-foreground">
          <PlayCircle className="w-3 h-3" />
          En curso
        </span>
        {inicio && <span className="text-xs text-muted-foreground">{inicio}</span>}
      </div>

      <div className="min-w-0">
        <p className="text-lg leading-6 font-bold text-card-foreground">{producto}</p>
        {meta}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2">
          <Package className="w-[18px] h-[18px] text-success" />
          <span className="text-[15px]">
            <strong className="font-bold">
              {tarimas} {tarimas === 1 ? "tarima" : "tarimas"}
            </strong>{" "}
            <span className="text-muted-foreground">verificadas</span>
          </span>
        </span>
        <span className="shrink-0 h-12 px-5 rounded-md bg-primary text-primary-foreground text-base font-semibold inline-flex items-center gap-2">
          Continuar
          <ArrowRight className="w-[18px] h-[18px]" />
        </span>
      </div>
    </button>
  )
}
