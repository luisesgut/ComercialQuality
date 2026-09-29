// src/components/QualityCajasSelector.tsx
// Selector de cajas de producción para verificaciones QUALITY.
// Basado en el selector de Destiny de app/dashboard/verificacion/[id]/page.tsx,
// pero con estado, carga y SignalR propios para no tocar el flujo de Destiny.
"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import * as signalR from "@microsoft/signalr"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, HelpCircle, Megaphone, Search } from "lucide-react"

const API_BASE_URL = "http://172.16.10.31/api";
const API_ORIGIN = new URL(API_BASE_URL).origin;
const QUALITY_UPDATE_STORAGE_KEY = "quality-trazabilidad-v1";

export interface QualityCajaDisponible {
    trazabilidad: string;
    piezas: number;
    yaRevisada: boolean;
    detalleId: number | null;
    otSispro: string | null;
    turno: string | null;
}

interface QualityMaquinaDisponible {
    noMaquina: string | number;
    totalCajas: number;
    cajasRevisadas: number;
    cajas: QualityCajaDisponible[];
}

interface QualityCajasDisponiblesResponse {
    orden: number;
    nombreProducto: string;
    totalCajas: number;
    maquinas: QualityMaquinaDisponible[];
    tieneHistoricoViejo: boolean;
}

type QualityStatusFilter = "all" | "pending" | "validated";

interface QualityCajasSelectorProps {
    verificationId: number;
    orden: string;
    selectedCaja: QualityCajaDisponible | null;
    // reason = "user" cuando el operador toca una caja, "refresh" cuando se re-sincroniza tras recargar
    onSelect: (caja: QualityCajaDisponible | null, reason: "user" | "refresh") => void;
    disabled?: boolean;
    // Cambiarlo fuerza una recarga silenciosa (p. ej. después de registrar una caja)
    refreshKey?: number;
}

const getQualityTurnoAbbreviation = (turno: string | null | undefined) => {
    const normalizedTurno = (turno ?? "").trim().toLowerCase();
    if (!normalizedTurno) return "Sin turno";
    const compactTurno = normalizedTurno.replace(/[^a-z0-9ñ]/g, "");
    if (
        compactTurno === "ta" ||
        compactTurno === "a" ||
        compactTurno === "turnoa" ||
        compactTurno.includes("matutino") ||
        compactTurno.includes("mañana")
    ) return "TA";
    if (
        compactTurno === "tr" ||
        compactTurno === "r" ||
        compactTurno === "turnor" ||
        compactTurno.includes("rotativo") ||
        compactTurno.includes("tarde")
    ) return "TR";
    if (
        compactTurno === "tn" ||
        compactTurno === "n" ||
        compactTurno === "turnon" ||
        compactTurno.includes("nocturno") ||
        compactTurno.includes("noche")
    ) return "TN";
    return (turno ?? "").trim().toUpperCase();
};

const matchesQualityCajaQuery = (caja: QualityCajaDisponible, query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const consecutivo = caja.trazabilidad.slice(-3);
    const turno = getQualityTurnoAbbreviation(caja.turno);
    const haystack = `${caja.trazabilidad} ${consecutivo} ${caja.otSispro ?? ""} ${turno}`.toLowerCase();
    return haystack.includes(normalizedQuery);
};

export function QualityCajasSelector({
    verificationId,
    orden,
    selectedCaja,
    onSelect,
    disabled = false,
    refreshKey = 0,
}: QualityCajasSelectorProps) {
    const [cajasDisponibles, setCajasDisponibles] = useState<QualityCajasDisponiblesResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchByMachine, setSearchByMachine] = useState<Record<string, string>>({});
    const [statusFilter, setStatusFilter] = useState<QualityStatusFilter>("all");
    const [openMaquinaAccordion, setOpenMaquinaAccordion] = useState<string>("");
    const [isUpdateHelpOpen, setIsUpdateHelpOpen] = useState(false);

    // Aviso de la actualización: se abre solo la primera vez en este navegador
    useEffect(() => {
        try {
            if (window.localStorage.getItem(QUALITY_UPDATE_STORAGE_KEY) !== "seen") {
                setIsUpdateHelpOpen(true);
            }
        } catch {
            // Sin acceso a localStorage: no se muestra automáticamente, sigue disponible con el botón de ayuda
        }
    }, []);

    const handleUpdateHelpOpenChange = (nextOpen: boolean) => {
        setIsUpdateHelpOpen(nextOpen);
        if (!nextOpen) {
            try {
                window.localStorage.setItem(QUALITY_UPDATE_STORAGE_KEY, "seen");
            } catch {
                // Ignorar: el aviso podría volver a mostrarse, pero no bloquea el registro
            }
        }
    };

    // Refs para que la recarga no dependa de la selección ni del callback del padre
    const selectedTrazabilidadRef = useRef<string | null>(selectedCaja?.trazabilidad ?? null);
    const onSelectRef = useRef(onSelect);
    useEffect(() => {
        selectedTrazabilidadRef.current = selectedCaja?.trazabilidad ?? null;
    }, [selectedCaja?.trazabilidad]);
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    const fetchCajasDisponibles = useCallback(
        async (options?: { silent?: boolean }) => {
            const normalizedOrden = String(orden ?? "").trim();
            if (!normalizedOrden) {
                setCajasDisponibles(null);
                setError(null);
                onSelectRef.current(null, "refresh");
                return;
            }

            const silent = options?.silent ?? false;
            if (!silent) {
                setIsLoading(true);
            }
            setError(null);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/Verificacion/cajas-disponibles/${encodeURIComponent(normalizedOrden)}`
                );
                if (!response.ok) {
                    throw new Error(`Error (${response.status}) al obtener cajas disponibles de Quality.`);
                }

                const data: QualityCajasDisponiblesResponse = await response.json();
                setCajasDisponibles(data);
                setSearchByMachine((current) => {
                    const next: Record<string, string> = {};
                    for (const maquina of data.maquinas ?? []) {
                        next[maquina.noMaquina] = current[maquina.noMaquina] ?? "";
                    }
                    return next;
                });

                // Mantener la selección actual con sus datos frescos (o limpiarla si ya no existe)
                const currentTrazabilidad = selectedTrazabilidadRef.current;
                if (currentTrazabilidad) {
                    const matchedCaja = data.maquinas
                        ?.flatMap((maquina) => maquina.cajas ?? [])
                        .find((caja) => caja.trazabilidad === currentTrazabilidad);
                    onSelectRef.current(matchedCaja ?? null, "refresh");
                }
            } catch (err: any) {
                setError(err.message || "Error de conexión al cargar cajas disponibles de Quality.");
                setCajasDisponibles(null);
                setSearchByMachine({});
                onSelectRef.current(null, "refresh");
            } finally {
                if (!silent) {
                    setIsLoading(false);
                }
            }
        },
        [orden]
    );

    useEffect(() => {
        void fetchCajasDisponibles();
    }, [fetchCajasDisponibles]);

    useEffect(() => {
        if (refreshKey > 0) {
            void fetchCajasDisponibles({ silent: true });
        }
    }, [refreshKey, fetchCajasDisponibles]);

    // Conexión SignalR propia: marca/desmarca cajas cuando otro usuario escanea o elimina
    useEffect(() => {
        if (!verificationId) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_ORIGIN}/verificacionHub`)
            .withAutomaticReconnect()
            .build();

        const setYaRevisada = (trazabilidad: string, yaRevisada: boolean) => {
            setCajasDisponibles((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    maquinas: prev.maquinas.map((maquina) => ({
                        ...maquina,
                        cajas: maquina.cajas.map((caja) =>
                            caja.trazabilidad === trazabilidad ? { ...caja, yaRevisada } : caja
                        ),
                    })),
                };
            });
        };

        connection.on("CajaEscaneada", (data: any) => {
            const trazabilidad = data?.Trazabilidad ?? data?.trazabilidad;
            if (trazabilidad) setYaRevisada(trazabilidad, true);
        });
        connection.on("CajaEliminada", (data: any) => {
            const trazabilidad = data?.Trazabilidad ?? data?.trazabilidad;
            if (trazabilidad) setYaRevisada(trazabilidad, false);
        });

        connection.onreconnected(async () => {
            try {
                await connection.invoke("UnirseAVerificacion", Number(verificationId));
            } catch (hubError) {
                console.error("[Quality] Error al reingresar al grupo de verificación:", hubError);
            }
        });

        const connect = async () => {
            try {
                await connection.start();
                await connection.invoke("UnirseAVerificacion", Number(verificationId));
            } catch (hubError) {
                console.error("[Quality] No se pudo conectar al hub de verificación:", hubError);
            }
        };

        connect();

        return () => {
            const leaveAndStop = async () => {
                try {
                    if (connection.state === signalR.HubConnectionState.Connected) {
                        await connection.invoke("SalirDeVerificacion", Number(verificationId));
                    }
                } catch (hubError) {
                    console.error("[Quality] Error al salir del grupo de verificación:", hubError);
                } finally {
                    try {
                        await connection.stop();
                    } catch (hubError) {
                        console.error("[Quality] Error al detener la conexión SignalR:", hubError);
                    }
                }
            };
            void leaveAndStop();
        };
    }, [verificationId]);

    const totals = (cajasDisponibles?.maquinas ?? []).reduce(
        (acc, maquina) => {
            for (const caja of maquina.cajas ?? []) {
                if (caja.yaRevisada) {
                    acc.validated += 1;
                } else {
                    acc.pending += 1;
                }
            }
            return acc;
        },
        { pending: 0, validated: 0 }
    );

    const renderCajaButton = (caja: QualityCajaDisponible) => {
        const isSelected = selectedCaja?.trazabilidad === caja.trazabilidad;
        const consecutivo = caja.trazabilidad.slice(-3);
        const turno = getQualityTurnoAbbreviation(caja.turno);

        return (
            <button
                key={caja.trazabilidad}
                type="button"
                onClick={() => {
                    if (disabled) return;
                    onSelect(caja, "user");
                    setOpenMaquinaAccordion("");
                }}
                disabled={disabled}
                className={`rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                        ? caja.yaRevisada
                            ? "border-amber-300 bg-amber-50 shadow-sm"
                            : "border-primary bg-primary/10 shadow-sm"
                    : caja.yaRevisada
                        ? "border-emerald-200 bg-emerald-50/70 hover:border-amber-300 hover:bg-amber-50"
                        : "border-border bg-background hover:border-primary/40"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Consecutivo
                        </p>
                        <p className="mt-1 text-3xl font-black leading-none text-foreground">
                            {consecutivo}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-foreground">
                            OT SisPro: {caja.otSispro || "Sin OT"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                            Turno: {turno}
                        </p>
                        <p className="mt-3 text-xs font-medium text-muted-foreground">
                            Trazabilidad
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground break-all">
                            {caja.trazabilidad}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {caja.piezas} piezas
                        </p>
                    </div>
                    {isSelected && caja.yaRevisada ? (
                        <Badge className="border border-amber-200 bg-amber-100 text-amber-800">
                            Retrabajo
                        </Badge>
                    ) : caja.yaRevisada ? (
                        <div className="flex flex-col items-end gap-1">
                            <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
                                Validada
                            </Badge>
                            <span className="text-[10px] font-semibold text-amber-700">
                                Seleccionar para retrabajo
                            </span>
                        </div>
                    ) : isSelected ? (
                        <Badge>Seleccionada</Badge>
                    ) : (
                        <Badge variant="outline">Pendiente</Badge>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <Label className="text-base font-medium">Caja Quality</Label>
                    <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                            Seleccione la trazabilidad exacta a revisar en esta tarima.
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => setIsUpdateHelpOpen(true)}
                            aria-label="Ver actualización de Quality"
                        >
                            <HelpCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchCajasDisponibles()}
                    disabled={disabled || isLoading}
                >
                    {isLoading ? "Cargando..." : "Actualizar"}
                </Button>
            </div>

            {cajasDisponibles && (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Orden {cajasDisponibles.orden}</Badge>
                        <Badge variant="outline">{cajasDisponibles.totalCajas} cajas</Badge>
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            {totals.pending} pendientes
                        </Badge>
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {totals.validated} validadas
                        </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                        {cajasDisponibles.nombreProducto}
                    </p>
                </div>
            )}

            {cajasDisponibles?.tieneHistoricoViejo && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-semibold">Esta verificación se inició con consecutivo manual.</p>
                        <p>
                            Las cajas registradas antes de la actualización se conservan en el histórico y en los
                            conteos, pero en esta lista pueden aparecer como <strong>pendientes</strong>.
                        </p>
                        <p>
                            Registra solo las cajas que tengas físicamente en la tarima actual; no vuelvas a escanear
                            cajas de tarimas ya cerradas.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

            {isLoading ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Cargando cajas disponibles...
                </div>
            ) : cajasDisponibles?.maquinas?.length ? (
                <>
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
                        <span className="text-sm font-medium text-foreground">Filtro:</span>
                        <Button
                            type="button"
                            variant={statusFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("all")}
                            disabled={disabled}
                        >
                            Todas
                        </Button>
                        <Button
                            type="button"
                            variant={statusFilter === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("pending")}
                            disabled={disabled}
                        >
                            Pendientes
                        </Button>
                        <Button
                            type="button"
                            variant={statusFilter === "validated" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("validated")}
                            disabled={disabled}
                        >
                            Validadas
                        </Button>
                    </div>
                    <Accordion type="single" collapsible className="w-full rounded-xl border border-border px-4" value={openMaquinaAccordion} onValueChange={setOpenMaquinaAccordion}>
                    {cajasDisponibles.maquinas.map((maquina) => {
                        const machineQuery = searchByMachine[maquina.noMaquina] ?? "";
                        const filteredCajas = maquina.cajas.filter((caja) =>
                            matchesQualityCajaQuery(caja, machineQuery)
                        );
                        const pendingCajas = filteredCajas.filter((caja) => !caja.yaRevisada);
                        const validatedCajas = filteredCajas.filter((caja) => caja.yaRevisada);
                        const visiblePendingCajas = statusFilter === "validated" ? [] : pendingCajas;
                        const visibleValidatedCajas = statusFilter === "pending" ? [] : validatedCajas;
                        const tieneSeleccionada = selectedCaja
                            ? maquina.cajas.some(c => c.trazabilidad === selectedCaja.trazabilidad)
                            : false;
                        return (
                        <AccordionItem key={`maquina-${maquina.noMaquina}`} value={`maquina-${maquina.noMaquina}`}>
                            <AccordionTrigger className="text-left">
                                <div className="flex flex-1 flex-wrap items-center gap-2 pr-4">
                                    <span className="font-semibold">Máquina {maquina.noMaquina}</span>
                                    <Badge variant="outline">{maquina.totalCajas} cajas</Badge>
                                    <Badge variant="secondary">{maquina.cajasRevisadas} revisadas</Badge>
                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                        {pendingCajas.length} pendientes
                                    </Badge>
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                        {validatedCajas.length} validadas
                                    </Badge>
                                    {tieneSeleccionada && (
                                        <Badge className="bg-primary/15 text-primary border-primary/30 border">Seleccionada</Badge>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pt-1 max-h-[420px] overflow-y-auto pr-1">
                                    <div className="relative sticky top-0 z-10 bg-background pb-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={machineQuery}
                                            onChange={(e) =>
                                                setSearchByMachine((current) => ({
                                                    ...current,
                                                    [maquina.noMaquina]: e.target.value,
                                                }))
                                            }
                                            placeholder="Buscar por consecutivo o trazabilidad"
                                            className="h-11 pl-9"
                                            disabled={disabled}
                                        />
                                    </div>
                                    {visiblePendingCajas.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                                    Pendientes de validar
                                                </p>
                                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                                    {visiblePendingCajas.length}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                {visiblePendingCajas.map((caja) => renderCajaButton(caja))}
                                            </div>
                                        </div>
                                    )}
                                    {visibleValidatedCajas.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                                    Ya validadas
                                                </p>
                                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    {visibleValidatedCajas.length}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                {visibleValidatedCajas.map((caja) => renderCajaButton(caja))}
                                            </div>
                                        </div>
                                    )}
                                    {filteredCajas.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                            No hay cajas que coincidan con esa búsqueda en la máquina {maquina.noMaquina}.
                                        </div>
                                    )}
                                    {filteredCajas.length > 0 &&
                                        visiblePendingCajas.length === 0 &&
                                        visibleValidatedCajas.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                            No hay cajas para el filtro seleccionado en la máquina {maquina.noMaquina}.
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                </>
            ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay cajas disponibles para esta orden.
                </div>
            )}

            {selectedCaja && (
                <div className={`rounded-xl border p-4 ${
                    selectedCaja.yaRevisada
                        ? "border-amber-300 bg-amber-50"
                        : "border-primary/30 bg-primary/5"
                }`}>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">Caja seleccionada</p>
                        {selectedCaja.yaRevisada && (
                            <Badge className="border border-amber-200 bg-amber-100 text-amber-800">
                                Se registrará como retrabajo
                            </Badge>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground break-all">
                        {selectedCaja.trazabilidad}
                    </p>
                </div>
            )}

            <Dialog open={isUpdateHelpOpen} onOpenChange={handleUpdateHelpOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <DialogTitle>Nueva actualización Quality</DialogTitle>
                        <DialogDescription className="pt-2 text-left leading-6">
                            Ya no es necesario ingresar el consecutivo manual para Quality.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 text-sm leading-6 text-slate-700">
                        <p>
                            Las cajas ahora vienen de la producción registrada en <strong>SISPRO</strong>. Identifica la
                            máquina y el consecutivo en la etiqueta, abre la máquina en la lista y selecciona la caja
                            para verificarla.
                        </p>
                        <p>
                            Si ves consecutivos iguales, revisa la <strong>máquina</strong>, la <strong>OT</strong> y el{" "}
                            <strong>turno</strong> para elegir la caja correcta.
                        </p>
                    </div>

                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <p>
                            <strong>Verificaciones iniciadas antes del cambio:</strong> las cajas que ya se registraron
                            con consecutivo manual se conservan en el histórico, pero en la lista pueden aparecer como
                            pendientes. No vuelvas a escanear cajas de tarimas ya cerradas.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" onClick={() => handleUpdateHelpOpenChange(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
