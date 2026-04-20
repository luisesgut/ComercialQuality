"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, ChevronsUpDown, Loader2, PlusCircle, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const API_BASE_URL = "http://172.16.10.31/api"

interface DefectoCatalogItem {
  id: number
  detalle: string
  familia: string
}

interface DeleteDefectoResponse {
  success?: boolean
  mensaje?: string
}

export function AdminDefectCatalog() {
  const [catalogoDefectos, setCatalogoDefectos] = useState<DefectoCatalogItem[]>([])
  const [detalle, setDetalle] = useState("")
  const [familia, setFamilia] = useState("")
  const [isFamiliaOpen, setIsFamiliaOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchCatalogoDefectos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/Verificacion/catalogo-defectos`)
      if (!response.ok) {
        throw new Error(`Error (${response.status}) al obtener catálogo de defectos.`)
      }

      const data: DefectoCatalogItem[] = await response.json()
      setCatalogoDefectos(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || "Error de conexión al cargar catálogo de defectos.")
      setCatalogoDefectos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCatalogoDefectos()
  }, [fetchCatalogoDefectos])

  const nextId = useMemo(() => {
    return catalogoDefectos.reduce((maxId, defecto) => Math.max(maxId, defecto.id), 0) + 1
  }, [catalogoDefectos])

  const groupedDefectos = useMemo(() => {
    return catalogoDefectos.reduce<Record<string, DefectoCatalogItem[]>>((acc, defecto) => {
      const familiaKey = defecto.familia?.trim() || "Sin familia"
      if (!acc[familiaKey]) {
        acc[familiaKey] = []
      }

      acc[familiaKey].push(defecto)
      return acc
    }, {})
  }, [catalogoDefectos])

  const familiasDisponibles = useMemo(() => {
    return Array.from(
      new Set(catalogoDefectos.map((defecto) => defecto.familia?.trim()).filter((familia): familia is string => Boolean(familia))),
    ).sort((a, b) => a.localeCompare(b))
  }, [catalogoDefectos])

  const familiaNormalizada = familia.trim().toLocaleLowerCase()
  const familiaExiste = familiasDisponibles.some((familiaOption) => familiaOption.toLocaleLowerCase() === familiaNormalizada)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const detalleValue = detalle.trim()
    const familiaValue = familia.trim()

    setSubmitError(null)
    setSubmitSuccess(null)

    if (!detalleValue || !familiaValue) {
      setSubmitError("Capture el detalle y la familia del defecto.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/Verificacion/catalogo-defectos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: nextId,
          detalle: detalleValue,
          familia: familiaValue,
        }),
      })

      if (!response.ok) {
        let detail = `Error (${response.status}) al agregar defecto.`
        try {
          const errorText = await response.text()
          if (errorText.trim()) {
            detail = errorText
          }
        } catch {}
        throw new Error(detail)
      }

      setDetalle("")
      setFamilia("")
      setSubmitSuccess(`Defecto agregado con ID ${nextId}.`)
      await fetchCatalogoDefectos()
    } catch (err: any) {
      setSubmitError(err.message || "Error de conexión al agregar defecto.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (defecto: DefectoCatalogItem) => {
    const confirmed = window.confirm(`Se desactivará el defecto "${defecto.detalle}" (ID ${defecto.id}).`)
    if (!confirmed) {
      return
    }

    setSubmitError(null)
    setSubmitSuccess(null)
    setDeletingId(defecto.id)

    try {
      const response = await fetch(`${API_BASE_URL}/Verificacion/catalogo-defectos/${defecto.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        let detail = `Error (${response.status}) al desactivar defecto.`
        try {
          const errorText = await response.text()
          if (errorText.trim()) {
            detail = errorText
          }
        } catch {}
        throw new Error(detail)
      }

      const data: DeleteDefectoResponse = await response.json()
      setSubmitSuccess(data.mensaje || "Defecto desactivado.")
      await fetchCatalogoDefectos()
    } catch (err: any) {
      setSubmitError(err.message || "Error de conexión al desactivar defecto.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Administrar Catálogo de Defectos
            </CardTitle>
            <CardDescription>
              Módulo visible solo para administradores. Permite consultar, agregar y desactivar defectos.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCatalogoDefectos()}
            disabled={isLoading || isSubmitting || deletingId !== null}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-[1.4fr_1fr_auto]" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nuevo-defecto-detalle">Detalle</Label>
            <Input
              id="nuevo-defecto-detalle"
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              placeholder="Ej. Mancha, rayón, sello incompleto"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nuevo-defecto-familia">Familia</Label>
            <Popover open={isFamiliaOpen} onOpenChange={setIsFamiliaOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="nuevo-defecto-familia"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isFamiliaOpen}
                  className="w-full justify-between"
                  disabled={isSubmitting || familiasDisponibles.length === 0}
                >
                  <span className="truncate">{familia || "Seleccione una familia"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command className="**:data-[slot=command-input-wrapper]:h-11 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:py-3">
                  <CommandInput placeholder="Buscar familia..." />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No se encontraron familias.</CommandEmpty>
                    <CommandGroup>
                      {familiaNormalizada && !familiaExiste ? (
                        <CommandItem
                          value={familia}
                          onSelect={() => {
                            setFamilia(familia.trim())
                            setIsFamiliaOpen(false)
                          }}
                        >
                          <Check className="mr-2 h-4 w-4 opacity-100" />
                          <span className="flex-1">Crear "{familia.trim()}"</span>
                        </CommandItem>
                      ) : null}
                      {familiasDisponibles.map((familiaOption) => (
                        <CommandItem
                          key={familiaOption}
                          value={familiaOption}
                          onSelect={() => {
                            setFamilia(familiaOption)
                            setIsFamiliaOpen(false)
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${familia === familiaOption ? "opacity-100" : "opacity-0"}`} />
                          <span className="flex-1">{familiaOption}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              value={familia}
              onChange={(event) => setFamilia(event.target.value)}
              placeholder="Seleccione una familia o escriba una nueva"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {familiasDisponibles.length === 0
                ? "No hay familias disponibles todavía en el catálogo. Capture una nueva."
                : "Puede seleccionar una familia existente o escribir una nueva."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>ID sugerido</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
              {nextId}
            </div>
          </div>

          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Agregar defecto
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo completar la operación</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {submitSuccess && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Operación completada</AlertTitle>
            <AlertDescription>{submitSuccess}</AlertDescription>
          </Alert>
        )}

        {isLoading && !error ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando catálogo de defectos...
          </div>
        ) : null}

        {!isLoading && !error && catalogoDefectos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No hay defectos disponibles en el catálogo.
          </div>
        ) : null}

        {!isLoading && !error && catalogoDefectos.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {catalogoDefectos.length} defectos activos en catálogo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/60">
              <Accordion type="single" collapsible className="w-full">
              {Object.entries(groupedDefectos)
                .sort(([familiaA], [familiaB]) => familiaA.localeCompare(familiaB))
                .map(([familiaGroup, defectos]) => (
                  <AccordionItem key={familiaGroup} value={familiaGroup} className="px-4 last:border-b-0">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                        <p className="truncate font-semibold text-foreground">{familiaGroup}</p>
                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {defectos.length} defectos
                        </span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-3">
                      <div className="space-y-2">
                        {defectos
                          .slice()
                          .sort((a, b) => a.detalle.localeCompare(b.detalle))
                          .map((defecto) => (
                            <div
                              key={defecto.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-card-foreground">{defecto.detalle}</p>
                                <p className="text-xs text-muted-foreground">ID {defecto.id}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(defecto)}
                                disabled={deletingId === defecto.id}
                                title={`Desactivar defecto ${defecto.detalle}`}
                              >
                                {deletingId === defecto.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
