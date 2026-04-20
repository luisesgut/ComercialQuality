// src/components/verification-detail.tsx
"use client"

import React, { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as signalR from "@microsoft/signalr";

// Asegúrate de importar tus interfaces y componentes de UI
import { DashboardData } from '@/app/types/verification-types'; 
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { VerificationProvider } from '@/lib/verification-context';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, ArrowLeft, TrendingUp, Package, Truck, AlertCircle, Clock, Layers, CheckSquare, HelpCircle, Check, CheckCircle2, Camera, Trash2, ExternalLink, ChevronsUpDown, ScanLine, Search } from 'lucide-react';
import { QrScannerModal } from "@/components/QrScannerModal";

// URL Base de la API
const API_BASE_URL = "http://172.16.10.31/api";
const API_ORIGIN = new URL(API_BASE_URL).origin;

interface VerificationDetailProps {
    verificationId: string;
}

interface TarimaActiva {
    tarimaId: number;
    numeroTarima: number;
    cajasLlevamos: number;
    meta: number;
    usuarioCreo: string;
}

interface TarimaActivaDefecto {
    detalle: string;
    familia: string;
    cantidad: number;
    comentario: string | null;
}

interface TarimaActivaCaja {
    detalleId: number;
    identificador: string;
    cantidad: number;
    piezasAuditadas: number;
    tieneDefectos: boolean;
    comentarios: string | null;
    horaEscaneo: string;
    defectos: TarimaActivaDefecto[];
    fotos?: string[];
}

interface TarimaColaborador {
    usuario: string;
    cajasEscaneadas: number;
}

interface TarimaActivaDetalle {
    tarimaId: number;
    numeroTarima: number;
    verificacionId: number;
    estado: string;
    puedeEditar: boolean;
    cajasEscaneadas: number;
    cajasMeta: number;
    usuarioCreo: string;
    fechaInicio: string;
    fechaCierre: string | null;
    colaboradores?: TarimaColaborador[];
    cajas: TarimaActivaCaja[];
}

interface DestinyCajaDisponible {
    trazabilidad: string;
    piezas: number;
    yaRevisada: boolean;
    detalleId: number | null;
}

interface DestinyMaquinaDisponible {
    noMaquina: number;
    totalCajas: number;
    cajasRevisadas: number;
    cajas: DestinyCajaDisponible[];
}

interface DestinyCajasDisponiblesResponse {
    orden: number;
    nombreProducto: string;
    totalCajas: number;
    maquinas: DestinyMaquinaDisponible[];
}

interface RegistrarEscaneoResponse {
    requiereConfirmacion?: boolean;
    detalleIdDuplicado?: number;
    mensajeConfirmacion?: string;
    ultimoDetalleId?: number;
    mensajeEstado?: string;
    porcentajeAvance?: number;
    numeroCaja?: number;
}

interface ReescanearCajaResponse {
    detalleId: number;
    identificador: string;
    cantidad: number;
    piezasAuditadas: number;
    tieneDefectos: boolean;
    comentarios: string | null;
    horaEscaneo: string;
}

interface TarimaTerminadaCaja {
    detalleId: number;
    identificador: string;
    cantidad: number;
    piezasAuditadas: number;
    tieneDefectos: boolean;
    comentarios: string | null;
    horaEscaneo: string;
    defectos?: TarimaTerminadaDefecto[];
    fotos?: string[];
}

interface TarimaTerminadaDefecto {
    defectoId?: number;
    detalle?: string;
    nombre?: string;
    cantidad?: number;
    comentario?: string | null;
}

interface EvidenciaCajaItem {
    evidenciaId: number;
    url: string;
}

interface EvidenciaCajaApiItem {
    evidenciaId?: number;
    EvidenciaId?: number;
    id?: number;
    Id?: number;
    foto?: string | null;
    Foto?: string | null;
    ruta?: string | null;
    Ruta?: string | null;
    url?: string | null;
    Url?: string | null;
    archivoUrl?: string | null;
    ArchivoUrl?: string | null;
    fotoUrl?: string | null;
    FotoUrl?: string | null;
    path?: string | null;
    Path?: string | null;
}

interface TarimaTerminada {
    tarimaId: number;
    numeroTarima: number;
    cajasRegistradas: number;
    usuario: string;
    fechaCierre: string;
    estatusCierre: string | null;
    comentarioCierre: string | null;
    cajas: TarimaTerminadaCaja[];
}

interface DefectoCatalogItem {
    id: number;
    detalle: string;
    familia: string;
}

interface DefectoCajaInputItem {
    defectoId: number | null;
    cantidad: string;
    comentario: string;
}

interface DefectoResumenItem {
    familia: string;
    detalle: string;
    vecesPresentado: number;
    piezasAfectadas: number;
}

interface CajaEscaneadaEvent {
    TarimaId: number;
    NumeroTarima: number;
    CajasEscaneadas: number;
    CajasMeta: number;
    TarimaCompleta: boolean;
    Trazabilidad?: string;
}

interface TarimaCreadaEvent {
    TarimaId: number;
    NumeroTarima: number;
    CajasMeta: number;
    Usuario: string;
}

interface TarimaCerradaEvent {
    TarimaId: number;
    NumeroTarima: number;
    EstatusCierre: "Aprobada" | "Rechazada" | "Con Defectos";
    ComentarioCierre: string | null;
}

interface CajaEliminadaEvent {
    DetalleId: number;
    TarimaId: number;
    CajasEscaneadas: number;
    Trazabilidad?: string;
}

interface TarimaReabiertaEvent {
    TarimaId: number;
    NumeroTarima: number;
}

interface TarimaEliminadaEvent {
    TarimaId: number;
    NumeroTarima?: number;
}

const CLOSE_TARIMA_STATUS_OPTIONS = [
    { value: "Aprobada", label: "Sin Hallazgos" },
    { value: "Con hallazgos", label: "Con Hallazgos" },
    { value: "Rechazada", label: "Rechazada" },
] as const;

const getCloseTarimaStatusLabel = (status: string | null | undefined) => {
    const normalizedStatus = (status || "").trim().toLowerCase();
    if (!normalizedStatus) return "Sin estatus";
    if (normalizedStatus === "aprobada" || normalizedStatus === "sin hallazgos") return "Sin Hallazgos";
    if (
        normalizedStatus === "con hallazgos" ||
        normalizedStatus === "con defectos"
    ) {
        return "Con Hallazgos";
    }
    if (normalizedStatus === "rechazada") return "Rechazada";
    return status || "Sin estatus";
};

export function VerificationDetail({ verificationId }: VerificationDetailProps) {
    const router = useRouter();
    const { user } = useAuth();
    const isAdminUser = user?.role?.trim().toLowerCase() === "administrador";
    const qtyUomVideoRef = useRef<HTMLVideoElement | null>(null);
    const qtyUomStreamRef = useRef<MediaStream | null>(null);
    const qtyUomRafRef = useRef<number | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>("USUARIO DESCONOCIDO");
    const [tarimasActivas, setTarimasActivas] = useState<TarimaActiva[]>([]);
    const [isTarimasLoading, setIsTarimasLoading] = useState(false);
    const [tarimasError, setTarimasError] = useState<string | null>(null);
    const [tarimasTerminadas, setTarimasTerminadas] = useState<TarimaTerminada[]>([]);
    const [isTarimasTerminadasLoading, setIsTarimasTerminadasLoading] = useState(false);
    const [tarimasTerminadasError, setTarimasTerminadasError] = useState<string | null>(null);
    const [selectedTarima, setSelectedTarima] = useState<TarimaActiva | null>(null);
    const [tarimaActivaDetalle, setTarimaActivaDetalle] = useState<TarimaActivaDetalle | null>(null);
    const [isTarimaActivaDetalleLoading, setIsTarimaActivaDetalleLoading] = useState(false);
    const [tarimaActivaDetalleError, setTarimaActivaDetalleError] = useState<string | null>(null);
    const [deletingCajaId, setDeletingCajaId] = useState<number | null>(null);
    const [deleteCajaError, setDeleteCajaError] = useState<string | null>(null);
    const [deleteCajaSuccess, setDeleteCajaSuccess] = useState<string | null>(null);
    const [isCreatingTarima, setIsCreatingTarima] = useState(false);
    const [createTarimaError, setCreateTarimaError] = useState<string | null>(null);
    const [createTarimaSuccess, setCreateTarimaSuccess] = useState<string | null>(null);
    const [deleteTarimaConfirmId, setDeleteTarimaConfirmId] = useState<number | null>(null);
    const [isDeletingTarima, setIsDeletingTarima] = useState(false);
    const [deleteTarimaError, setDeleteTarimaError] = useState<string | null>(null);
    const [trazabilidadInput, setTrazabilidadInput] = useState("");
    const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
    const [consecutivoManualInput, setConsecutivoManualInput] = useState("");
    const [destinyCajasDisponibles, setDestinyCajasDisponibles] = useState<DestinyCajasDisponiblesResponse | null>(null);
    const [isDestinyCajasLoading, setIsDestinyCajasLoading] = useState(false);
    const [destinyCajasError, setDestinyCajasError] = useState<string | null>(null);
    const [selectedDestinyCaja, setSelectedDestinyCaja] = useState<DestinyCajaDisponible | null>(null);
    const [destinySearchByMachine, setDestinySearchByMachine] = useState<Record<number, string>>({});
    const [openMaquinaAccordion, setOpenMaquinaAccordion] = useState<string>("");
    const [qtyUomEtiquetaInput, setQtyUomEtiquetaInput] = useState("");
    const [piezasAuditadasInput, setPiezasAuditadasInput] = useState("");
    const [tieneDefectosInput, setTieneDefectosInput] = useState(false);
    const [catalogoDefectos, setCatalogoDefectos] = useState<DefectoCatalogItem[]>([]);
    const [isCatalogoDefectosLoading, setIsCatalogoDefectosLoading] = useState(false);
    const [catalogoDefectosError, setCatalogoDefectosError] = useState<string | null>(null);
    const [openDefectoIndex, setOpenDefectoIndex] = useState<number | null>(null);
    const [defectosCajaInput, setDefectosCajaInput] = useState<DefectoCajaInputItem[]>([
        { defectoId: null, cantidad: "", comentario: "" },
    ]);
    const [defectosResumen, setDefectosResumen] = useState<DefectoResumenItem[]>([]);
    const [isDefectosResumenLoading, setIsDefectosResumenLoading] = useState(false);
    const [defectosResumenError, setDefectosResumenError] = useState<string | null>(null);
    const [isRegisteringScan, setIsRegisteringScan] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    const [registerStatusMessage, setRegisterStatusMessage] = useState<string | null>(null);
    const [lastDetalleId, setLastDetalleId] = useState<number | null>(null);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [evidenceTargetId, setEvidenceTargetId] = useState<number | null>(null);
    const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
    const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
    const [deletingEvidenceId, setDeletingEvidenceId] = useState<number | null>(null);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
    const [evidenceByDetalleId, setEvidenceByDetalleId] = useState<Record<number, EvidenciaCajaItem[]>>({});
    const [isEvidenceListLoadingByDetalleId, setIsEvidenceListLoadingByDetalleId] = useState<Record<number, boolean>>({});
    const [isCloseTarimaModalOpen, setIsCloseTarimaModalOpen] = useState(false);
    const [closeTarimaEstatusCierre, setCloseTarimaEstatusCierre] = useState("");
    const [closeTarimaAgregarComentario, setCloseTarimaAgregarComentario] = useState(false);
    const [closeTarimaComentario, setCloseTarimaComentario] = useState("");
    const [reopeningTarimaId, setReopeningTarimaId] = useState<number | null>(null);
    const [reopenTarimaError, setReopenTarimaError] = useState<string | null>(null);
    const [reopenTarimaSuccess, setReopenTarimaSuccess] = useState<string | null>(null);
    const [isClosingTarima, setIsClosingTarima] = useState(false);
    const [closeTarimaError, setCloseTarimaError] = useState<string | null>(null);
    const [closeTarimaSuccess, setCloseTarimaSuccess] = useState<string | null>(null);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [finishMuestreo, setFinishMuestreo] = useState("");
    const [finishComentarios, setFinishComentarios] = useState("");
    const [isFinishing, setIsFinishing] = useState(false);
    const [finishError, setFinishError] = useState<string | null>(null);
    const [finishSuccess, setFinishSuccess] = useState<string | null>(null);
    const [isConsecutivoHelpOpen, setIsConsecutivoHelpOpen] = useState(false);
    const [isDestinyUpdateHelpOpen, setIsDestinyUpdateHelpOpen] = useState(false);
    const [isPzasCajaHelpOpen, setIsPzasCajaHelpOpen] = useState(false);
    const [qtyUomScanError, setQtyUomScanError] = useState<string | null>(null);
    const [isQtyUomScannerOpen, setIsQtyUomScannerOpen] = useState(false);
    const selectedTarimaIdRef = useRef<number | null>(null);
    
    // Función para obtener los detalles del dashboard (GET a /dashboard/{id})
    const fetchDashboardData = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;
        if (!silent) {
            setIsLoading(true);
            setError(null);
        }
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/dashboard/${verificationId}`);
            
            if (!response.ok) {
                // Si la verificación no existe o hay un error 4xx/5xx
                throw new Error(`Error (${response.status}) al obtener detalles del dashboard.`);
            }
            const data: DashboardData = await response.json();
            setDashboardData(data);
        } catch (err: any) {
            if (!silent) {
                setError(err.message || "Error de conexión al cargar el dashboard.");
                setDashboardData(null); // Limpiar datos si hay error
            }
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, [verificationId]);

    const openExternalDocument = (url: string, documentName: string) => {
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
            alert(`No se pudo abrir ${documentName}. Verifique que el navegador permita ventanas emergentes.`);
        }
    };

    const handleOpenPrintCard = () => {
        if (!dashboardData?.printCard) return;
        const printCardUrl = `${API_BASE_URL}/Printcard/${encodeURIComponent(dashboardData.printCard)}`;
        openExternalDocument(printCardUrl, "el PrintCard");
    };

    const handleOpenFichaTecnica = () => {
        if (!dashboardData?.printCard) return;
        const fichaTecnicaUrl = `${API_BASE_URL}/Printcard/ficha/${encodeURIComponent(dashboardData.printCard)}`;
        openExternalDocument(fichaTecnicaUrl, "la Ficha Tecnica");
    };

    const fetchTarimasActivas = useCallback(async () => {
        setIsTarimasLoading(true);
        setTarimasError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/tarimas-activas/${verificationId}`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener tarimas activas.`);
            }
            const data: TarimaActiva[] = await response.json();
            setTarimasActivas(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setTarimasError(err.message || "Error de conexión al cargar tarimas.");
            setTarimasActivas([]);
        } finally {
            setIsTarimasLoading(false);
        }
    }, [verificationId]);

    const fetchTarimasTerminadas = useCallback(async () => {
        setIsTarimasTerminadasLoading(true);
        setTarimasTerminadasError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/tarimas-terminadas/${verificationId}`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener tarimas terminadas.`);
            }
            const data: TarimaTerminada[] = await response.json();
            setTarimasTerminadas(Array.isArray(data) ? data : []);
            void hydrateEvidenceForCajas(
                (Array.isArray(data) ? data : []).flatMap((tarima) => Array.isArray(tarima.cajas) ? tarima.cajas : [])
            );
        } catch (err: any) {
            setTarimasTerminadasError(err.message || "Error de conexión al cargar tarimas terminadas.");
            setTarimasTerminadas([]);
        } finally {
            setIsTarimasTerminadasLoading(false);
        }
    }, [verificationId]);

    const fetchTarimaActivaDetalle = useCallback(async (tarimaId: number) => {
        setIsTarimaActivaDetalleLoading(true);
        setTarimaActivaDetalleError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/tarima/${tarimaId}`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener detalle de la tarima.`);
            }
            const data: TarimaActivaDetalle = await response.json();
            setTarimaActivaDetalle(data);
            void hydrateEvidenceForCajas(data.cajas ?? []);
        } catch (err: any) {
            setTarimaActivaDetalleError(err.message || "Error de conexión al cargar detalle de tarima.");
            setTarimaActivaDetalle(null);
        } finally {
            setIsTarimaActivaDetalleLoading(false);
        }
    }, []);

    const fetchDestinyCajasDisponibles = useCallback(
        async (orden: string, options?: { silent?: boolean }) => {
            const normalizedOrden = String(orden ?? "").trim();
            if (!normalizedOrden) {
                setDestinyCajasDisponibles(null);
                setDestinyCajasError(null);
                setSelectedDestinyCaja(null);
                return;
            }

            const silent = options?.silent ?? false;
            if (!silent) {
                setIsDestinyCajasLoading(true);
            }
            setDestinyCajasError(null);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/Verificacion/cajas-disponibles/${encodeURIComponent(normalizedOrden)}`
                );
                if (!response.ok) {
                    throw new Error(`Error (${response.status}) al obtener cajas disponibles de Destiny.`);
                }

                const data: DestinyCajasDisponiblesResponse = await response.json();
                setDestinyCajasDisponibles(data);
                setDestinySearchByMachine((current) => {
                    const next: Record<number, string> = {};
                    for (const maquina of data.maquinas ?? []) {
                        next[maquina.noMaquina] = current[maquina.noMaquina] ?? "";
                    }
                    return next;
                });
                setSelectedDestinyCaja((current) => {
                    if (!current?.trazabilidad) return null;
                    const matchedCaja = data.maquinas
                        ?.flatMap((maquina) => maquina.cajas ?? [])
                        .find((caja) => caja.trazabilidad === current.trazabilidad && !caja.yaRevisada);
                    return matchedCaja ?? null;
                });
            } catch (err: any) {
                setDestinyCajasError(err.message || "Error de conexión al cargar cajas disponibles de Destiny.");
                setDestinyCajasDisponibles(null);
                setSelectedDestinyCaja(null);
                setDestinySearchByMachine({});
            } finally {
                if (!silent) {
                    setIsDestinyCajasLoading(false);
                }
            }
        },
        []
    );

    const fetchCatalogoDefectos = useCallback(async () => {
        setIsCatalogoDefectosLoading(true);
        setCatalogoDefectosError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/catalogo-defectos`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener catálogo de defectos.`);
            }
            const data: DefectoCatalogItem[] = await response.json();
            setCatalogoDefectos(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setCatalogoDefectosError(err.message || "Error de conexión al cargar catálogo de defectos.");
            setCatalogoDefectos([]);
        } finally {
            setIsCatalogoDefectosLoading(false);
        }
    }, []);

    const fetchDefectosResumen = useCallback(async () => {
        setIsDefectosResumenLoading(true);
        setDefectosResumenError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/defectos-verificacion/${verificationId}`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener resumen de defectos.`);
            }
            const data: DefectoResumenItem[] = await response.json();
            setDefectosResumen(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setDefectosResumenError(err.message || "Error de conexión al cargar resumen de defectos.");
            setDefectosResumen([]);
        } finally {
            setIsDefectosResumenLoading(false);
        }
    }, [verificationId]);

    // Ejecutar el fetch al montar el componente y cuando el ID cambie
    useEffect(() => {
        if (verificationId) {
            fetchDashboardData();
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchCatalogoDefectos();
            fetchDefectosResumen();
        }
    }, [verificationId]);

    useEffect(() => {
        if (!selectedTarima) {
            setTarimaActivaDetalle(null);
            setTarimaActivaDetalleError(null);
            return;
        }
        fetchTarimaActivaDetalle(selectedTarima.tarimaId);
    }, [selectedTarima?.tarimaId, fetchTarimaActivaDetalle]);

    useEffect(() => {
        if (user?.name) {
            setCurrentUserName(user.name);
        }
    }, [user]);

    useEffect(() => {
        setRegisterError(null);
        setRegisterSuccess(null);
        setRegisterStatusMessage(null);
        setCloseTarimaError(null);
        setCloseTarimaSuccess(null);
        setSelectedDestinyCaja(null);
        setDestinySearchByMachine({});
    }, [selectedTarima]);

    useEffect(() => {
        if (!createTarimaSuccess) return;
        const timeoutId = window.setTimeout(() => setCreateTarimaSuccess(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [createTarimaSuccess]);

    useEffect(() => {
        if (!deleteCajaSuccess) return;
        const timeoutId = window.setTimeout(() => setDeleteCajaSuccess(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [deleteCajaSuccess]);

    useEffect(() => {
        if (!reopenTarimaSuccess) return;
        const timeoutId = window.setTimeout(() => setReopenTarimaSuccess(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [reopenTarimaSuccess]);

    useEffect(() => {
        if (!closeTarimaSuccess) return;
        const timeoutId = window.setTimeout(() => setCloseTarimaSuccess(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [closeTarimaSuccess]);

    // Evitar cierre accidental de pestaña cuando hay una tarima activa seleccionada
    useEffect(() => {
        if (!selectedTarima) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [selectedTarima]);

    useEffect(() => {
        if (!registerSuccess) return;
        const timeoutId = window.setTimeout(() => setRegisterSuccess(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [registerSuccess]);

    useEffect(() => {
        if (!registerStatusMessage) return;
        const timeoutId = window.setTimeout(() => setRegisterStatusMessage(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [registerStatusMessage]);

    useEffect(() => {
        if (!createTarimaError) return;
        const timeoutId = window.setTimeout(() => setCreateTarimaError(null), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [createTarimaError]);

    useEffect(() => {
        if (!deleteTarimaError) return;
        const timeoutId = window.setTimeout(() => setDeleteTarimaError(null), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [deleteTarimaError]);

    useEffect(() => {
        if (!deleteCajaError) return;
        const timeoutId = window.setTimeout(() => setDeleteCajaError(null), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [deleteCajaError]);

    useEffect(() => {
        if (!reopenTarimaError) return;
        const timeoutId = window.setTimeout(() => setReopenTarimaError(null), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [reopenTarimaError]);

    useEffect(() => {
        if (!closeTarimaError) return;
        const timeoutId = window.setTimeout(() => setCloseTarimaError(null), 5000);
        return () => window.clearTimeout(timeoutId);
    }, [closeTarimaError]);

    useEffect(() => {
        const isDestiny =
            dashboardData?.cliente === "DESTINY" ||
            (dashboardData?.productoInfo ?? dashboardData?.nombreProducto ?? "").toUpperCase().includes("DESTINY");
        if (isDestiny && selectedDestinyCaja) {
            setQtyUomEtiquetaInput(String(selectedDestinyCaja.piezas));
            return;
        }

        const fixedQty = Number(dashboardData?.piezasPorCaja ?? 0);
        setQtyUomEtiquetaInput(fixedQty > 0 ? String(fixedQty) : "");
    }, [dashboardData?.cliente, dashboardData?.nombreProducto, dashboardData?.piezasPorCaja, dashboardData?.productoInfo, selectedDestinyCaja]);

    useEffect(() => {
        const isDestiny =
            dashboardData?.cliente === "DESTINY" ||
            (dashboardData?.productoInfo ?? dashboardData?.nombreProducto ?? "").toUpperCase().includes("DESTINY");
        if (!isDestiny) {
            setDestinyCajasDisponibles(null);
            setDestinyCajasError(null);
            setSelectedDestinyCaja(null);
            setDestinySearchByMachine({});
            return;
        }

        const orden = String(dashboardData?.loteOrden ?? "").trim();
        if (!orden) return;

        void fetchDestinyCajasDisponibles(orden);
    }, [
        dashboardData?.cliente,
        dashboardData?.loteOrden,
        dashboardData?.nombreProducto,
        dashboardData?.productoInfo,
        fetchDestinyCajasDisponibles,
    ]);

    useEffect(() => {
        selectedTarimaIdRef.current = selectedTarima?.tarimaId ?? null;
    }, [selectedTarima?.tarimaId]);

    const handleAddDefectoItem = () => {
        setDefectosCajaInput((prev) => [...prev, { defectoId: null, cantidad: "", comentario: "" }]);
    };

    const handleRemoveDefectoItem = (index: number) => {
        setDefectosCajaInput((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    };

    const updateDefectoItem = (index: number, updates: Partial<DefectoCajaInputItem>) => {
        setDefectosCajaInput((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
        );
    };

    // Sincronizar selectedTarima con los datos frescos de tarimasActivas.
    // Sin esto, selectedTarima.cajasLlevamos queda como snapshot stale
    // y el botón "Terminar tarima" permanece deshabilitado tras agregar la primera caja.
    useEffect(() => {
        if (!selectedTarima) return;
        const updated = tarimasActivas.find((t) => t.tarimaId === selectedTarima.tarimaId);
        if (updated && updated.cajasLlevamos !== selectedTarima.cajasLlevamos) {
            setSelectedTarima(updated);
            fetchTarimaActivaDetalle(updated.tarimaId);
        }
    }, [tarimasActivas, selectedTarima, fetchTarimaActivaDetalle]);

    const refreshVerificationData = useCallback((options?: {
        includeTerminadas?: boolean;
        includeDefectos?: boolean;
        tarimaId?: number | null;
    }) => {
        const includeTerminadas = options?.includeTerminadas ?? true;
        const includeDefectos = options?.includeDefectos ?? false;
        const currentTarimaId = options?.tarimaId ?? selectedTarimaIdRef.current;

        fetchDashboardData({ silent: true });
        fetchTarimasActivas();
        if (includeTerminadas) {
            fetchTarimasTerminadas();
        }
        if (includeDefectos) {
            fetchDefectosResumen();
        }
        if (currentTarimaId) {
            fetchTarimaActivaDetalle(currentTarimaId);
        }
    }, [fetchDashboardData, fetchTarimasActivas, fetchTarimasTerminadas, fetchDefectosResumen, fetchTarimaActivaDetalle]);

    useEffect(() => {
        if (!verificationId) return;

        const hubUrl = `${API_ORIGIN}/verificacionHub`;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .build();

        const onCajaEscaneada = (data: CajaEscaneadaEvent) => {
            console.log("[SignalR] CajaEscaneada raw data:", JSON.stringify(data));
            // Marcar la caja Destiny como ya revisada sin re-fetch
            const trazabilidad = data.Trazabilidad ?? (data as any).trazabilidad;
            if (trazabilidad) {
                setDestinyCajasDisponibles(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        maquinas: prev.maquinas.map(maquina => ({
                            ...maquina,
                            cajasRevisadas: maquina.cajas.some(c => c.trazabilidad === trazabilidad && !c.yaRevisada)
                                ? maquina.cajasRevisadas + 1
                                : maquina.cajasRevisadas,
                            cajas: maquina.cajas.map(caja =>
                                caja.trazabilidad === trazabilidad
                                    ? { ...caja, yaRevisada: true }
                                    : caja
                            ),
                        })),
                    };
                });
            }
            refreshVerificationData({
                includeTerminadas: data.TarimaCompleta,
                tarimaId: data.TarimaId,
            });
        };

        const onTarimaCreada = (_data: TarimaCreadaEvent) => {
            refreshVerificationData({ includeTerminadas: false });
        };

        const onTarimaCerrada = (data: TarimaCerradaEvent) => {
            if (selectedTarimaIdRef.current === data.TarimaId) {
                setSelectedTarima(null);
            }
            refreshVerificationData();
        };

        const onCajaEliminada = (data: CajaEliminadaEvent) => {
            const trazabilidad = data.Trazabilidad ?? (data as any).trazabilidad;
            if (trazabilidad) {
                setDestinyCajasDisponibles(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        maquinas: prev.maquinas.map(maquina => ({
                            ...maquina,
                            cajasRevisadas: maquina.cajas.some(c => c.trazabilidad === trazabilidad && c.yaRevisada)
                                ? maquina.cajasRevisadas - 1
                                : maquina.cajasRevisadas,
                            cajas: maquina.cajas.map(caja =>
                                caja.trazabilidad === trazabilidad
                                    ? { ...caja, yaRevisada: false }
                                    : caja
                            ),
                        })),
                    };
                });
            }
            refreshVerificationData({
                includeTerminadas: false,
                includeDefectos: true,
                tarimaId: data.TarimaId,
            });
        };

        const onTarimaReabierta = (_data: TarimaReabiertaEvent) => {
            refreshVerificationData();
        };

        const onTarimaEliminada = (data: TarimaEliminadaEvent) => {
            if (selectedTarimaIdRef.current === data.TarimaId) {
                setSelectedTarima(null);
            }
            refreshVerificationData({ includeTerminadas: false });
        };

        connection.on("CajaEscaneada", onCajaEscaneada);
        connection.on("TarimaCreada", onTarimaCreada);
        connection.on("TarimaCerrada", onTarimaCerrada);
        connection.on("CajaEliminada", onCajaEliminada);
        connection.on("TarimaReabierta", onTarimaReabierta);
        connection.on("TarimaEliminada", onTarimaEliminada);

        connection.onreconnected(async () => {
            try {
                await connection.invoke("UnirseAVerificacion", Number(verificationId));
            } catch (hubError) {
                console.error("Error al reingresar al grupo de verificación:", hubError);
            }
        });

        const connect = async () => {
            try {
                await connection.start();
                await connection.invoke("UnirseAVerificacion", Number(verificationId));
            } catch (hubError) {
                console.error("No se pudo conectar al hub de verificación:", hubError);
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
                    console.error("Error al salir del grupo de verificación:", hubError);
                } finally {
                    try {
                        await connection.stop();
                    } catch (hubError) {
                        console.error("Error al detener la conexión SignalR:", hubError);
                    }
                }
            };
            void leaveAndStop();
        };
    }, [verificationId, refreshVerificationData]);

    const handleQtyUomCaptureClick = () => {
        setQtyUomScanError(null);
        setIsQtyUomScannerOpen(true);
    };

    useEffect(() => {
        if (!isQtyUomScannerOpen) {
            if (qtyUomRafRef.current !== null) {
                cancelAnimationFrame(qtyUomRafRef.current);
                qtyUomRafRef.current = null;
            }
            if (qtyUomStreamRef.current) {
                qtyUomStreamRef.current.getTracks().forEach((track) => track.stop());
                qtyUomStreamRef.current = null;
            }
            return;
        }

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
            setQtyUomScanError("Escaneo no disponible en este dispositivo.");
            return;
        }

        let isCancelled = false;
        const detector = new BarcodeDetectorCtor({
            formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
        });

        const startScanner = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
                if (isCancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                qtyUomStreamRef.current = stream;
                if (qtyUomVideoRef.current) {
                    qtyUomVideoRef.current.srcObject = stream;
                    await qtyUomVideoRef.current.play();
                }

                const scanFrame = async () => {
                    if (isCancelled || !qtyUomVideoRef.current) return;
                    try {
                        const barcodes = await detector.detect(qtyUomVideoRef.current);
                        const rawValue = barcodes?.[0]?.rawValue ?? "";
                        const numericValue = rawValue.replace(/\D/g, "");
                        if (numericValue) {
                            setQtyUomEtiquetaInput(numericValue);
                            setIsQtyUomScannerOpen(false);
                            return;
                        }
                    } catch {
                        // keep scanning
                    }
                    qtyUomRafRef.current = requestAnimationFrame(scanFrame);
                };

                qtyUomRafRef.current = requestAnimationFrame(scanFrame);
            } catch (scanError) {
                setQtyUomScanError("No se pudo acceder a la camara.");
            }
        };

        startScanner();

        return () => {
            isCancelled = true;
        };
    }, [isQtyUomScannerOpen]);

    const getVerificationType = (): "BIOFLEX" | "DESTINY" | "QUALITY" => {
        if (!dashboardData) return "BIOFLEX";
        if (dashboardData.cliente === "DESTINY") return "DESTINY";
        if (dashboardData.cliente === "QUALITY") return "QUALITY";
        if (dashboardData.cliente === "BIOFLEX") return "BIOFLEX";
        const productInfoUpper = (dashboardData.productoInfo ?? dashboardData.nombreProducto ?? "").toUpperCase();
        if (productInfoUpper.includes("DESTINY") || productInfoUpper.includes("61953")) {
            return "DESTINY";
        }
        if (productInfoUpper.includes("QUALITY")) {
            return "QUALITY";
        }
        return "BIOFLEX";
    };

    
    // --- Renderizado de Estados ---
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Cargando dashboard de verificación...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                 <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/pendientes")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Card className="border-0 shadow-lg bg-card">
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-card-foreground mb-2">Error al cargar</h3>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <Button onClick={() => fetchDashboardData()}>Reintentar Carga</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!dashboardData) return null; // Debería ser atrapado por error o loading

    const verifiedIdNumber = dashboardData.verificacionId;
    const currentVerificationType = getVerificationType();
    const cajasMetaEstimadas =
        dashboardData.piezasPorCaja && dashboardData.piezasPorCaja > 0
            ? Math.ceil(dashboardData.piezasMeta / dashboardData.piezasPorCaja)
            : null;
    const cajasProgress = cajasMetaEstimadas && cajasMetaEstimadas > 0
        ? Math.min(100, (dashboardData.cajasActuales / cajasMetaEstimadas) * 100)
        : 0;
    const defectosPorFamilia = catalogoDefectos.reduce<Record<string, DefectoCatalogItem[]>>((acc, defecto) => {
        if (!acc[defecto.familia]) acc[defecto.familia] = [];
        acc[defecto.familia].push(defecto);
        return acc;
    }, {});
    const selectedTarimaDetalle =
        selectedTarima && tarimaActivaDetalle?.tarimaId === selectedTarima.tarimaId
            ? tarimaActivaDetalle
            : null;

    const resolveEvidenceUrl = (foto: string) => {
        if (!foto) return "";
        if (/^https?:\/\//i.test(foto)) return foto;
        return `${API_ORIGIN}${foto.startsWith("/") ? foto : `/${foto}`}`;
    };

    const normalizeEvidenceItem = (item: EvidenciaCajaApiItem): EvidenciaCajaItem | null => {
        const evidenciaId = Number(item.evidenciaId ?? item.EvidenciaId ?? item.id ?? item.Id);
        const rawUrl =
            item.url ??
            item.Url ??
            item.archivoUrl ??
            item.ArchivoUrl ??
            item.fotoUrl ??
            item.FotoUrl ??
            item.foto ??
            item.Foto ??
            item.ruta ??
            item.Ruta ??
            item.path ??
            item.Path;

        if (!Number.isFinite(evidenciaId) || evidenciaId <= 0 || !rawUrl) return null;

        return {
            evidenciaId,
            url: resolveEvidenceUrl(rawUrl),
        };
    };

    function getCajaEvidencias(detalleId: number, fallbackFotos?: string[]) {
        const apiData = evidenceByDetalleId[detalleId];
        if (apiData?.length) {
            return apiData;
        }
        // Si la API no tiene datos (key no existe o devolvió vacío), usar fallback de caja.fotos
        return (fallbackFotos ?? []).map((foto, index) => ({
            evidenciaId: -(index + 1),
            url: resolveEvidenceUrl(foto),
        }));
    }

    function getCajaFallbackFotos(detalleId: number) {
        const activeCaja = selectedTarimaDetalle?.cajas?.find((caja) => caja.detalleId === detalleId);
        if (activeCaja?.fotos?.length) {
            return activeCaja.fotos;
        }

        for (const tarima of tarimasTerminadas) {
            const finishedCaja = tarima.cajas?.find((caja) => caja.detalleId === detalleId);
            if (finishedCaja?.fotos?.length) {
                return finishedCaja.fotos;
            }
        }

        return undefined;
    }

    async function fetchCajaEvidencias(detalleId: number) {
        if (!detalleId) return [];

        setIsEvidenceListLoadingByDetalleId((prev) => ({ ...prev, [detalleId]: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/fotos-caja/${detalleId}`);
            if (!response.ok) {
                throw new Error(await parseApiError(response, `Error (${response.status}) al obtener fotos de la caja.`));
            }

            const data = await response.json();
            const evidencias = Array.isArray(data)
                ? data
                    .map((item) => normalizeEvidenceItem(item as EvidenciaCajaApiItem))
                    .filter((item): item is EvidenciaCajaItem => item !== null)
                : [];

            setEvidenceByDetalleId((prev) => ({ ...prev, [detalleId]: evidencias }));
            return evidencias;
        } finally {
            setIsEvidenceListLoadingByDetalleId((prev) => ({ ...prev, [detalleId]: false }));
        }
    }

    async function hydrateEvidenceForCajas(cajas: Array<{ detalleId: number }>) {
        const detalleIds = Array.from(
            new Set(
                cajas
                    .map((caja) => Number(caja.detalleId))
                    .filter((detalleId) => Number.isFinite(detalleId) && detalleId > 0)
            )
        ).filter((id) => !evidenceByDetalleId[id]?.length); // skip IDs ya cacheados

        if (!detalleIds.length) return;

        // Fetch en lotes de 5 para no saturar el servidor con 50+ requests simultáneas
        const BATCH_SIZE = 5;
        for (let i = 0; i < detalleIds.length; i += BATCH_SIZE) {
            const batch = detalleIds.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (detalleId) => {
                    try {
                        await fetchCajaEvidencias(detalleId);
                    } catch {
                        // keep fallback fotos from tarima payload
                    }
                })
            );
        }
    }

    async function parseApiError(response: Response, fallback: string) {
        let detail = fallback;
        try {
            const errorText = await response.text();
            if (errorText) {
                try {
                    const errorData = JSON.parse(errorText);
                    detail = errorData.detail || errorData.message || errorData.error || detail;
                } catch {
                    detail = errorText;
                }
            }
        } catch {
            // ignore parse error
        }
        return detail;
    }

    const renderEvidenceGallery = (
        detalleId: number,
        fallbackFotos: string[] | undefined,
        options?: { editable?: boolean; compact?: boolean; showManageButton?: boolean }
    ) => {
        const evidencias = getCajaEvidencias(detalleId, fallbackFotos);
        const editable = options?.editable ?? false;
        const compact = options?.compact ?? false;
        const showManageButton = options?.showManageButton ?? editable;
        const isLoadingEvidence = isEvidenceListLoadingByDetalleId[detalleId];

        if (!evidencias.length && !isLoadingEvidence) return null;

        return (
            <div className={`mt-3 rounded-xl border ${compact ? "p-3" : "p-4"} bg-gradient-to-br from-slate-50 to-white`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Evidencia Visual</p>
                        <p className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
                            {isLoadingEvidence ? "Cargando fotos..." : `${evidencias.length} foto(s) asociadas`}
                        </p>
                    </div>
                    {showManageButton && (
                        <Button
                            type="button"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => openEvidenceForCaja(detalleId)}
                        >
                            <Camera className="w-4 h-4 mr-1.5" />
                            Gestionar
                        </Button>
                    )}
                </div>

                <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
                    {evidencias.map((foto, index) => (
                        <div
                            key={`${detalleId}-evidence-${foto.evidenciaId}-${index}`}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                        >
                            <img
                                src={foto.url}
                                alt={`Evidencia ${index + 1} de la caja ${detalleId}`}
                                className={`w-full object-cover transition-transform duration-200 group-hover:scale-105 ${compact ? "h-24" : "h-32"}`}
                            />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <span className="text-[11px] font-medium text-white">Foto {index + 1}</span>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={foto.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-900 transition hover:bg-white"
                                        title="Abrir foto"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    {editable && foto.evidenciaId > 0 && (
                                        <button
                                            type="button"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white transition hover:bg-red-500 disabled:opacity-60"
                                            onClick={() => handleDeleteEvidence(detalleId, foto.evidenciaId)}
                                            disabled={deletingEvidenceId === foto.evidenciaId}
                                            title="Eliminar foto"
                                        >
                                            {deletingEvidenceId === foto.evidenciaId ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const normalizeTarimaEstado = (estado?: string | null) => (estado || "").trim().toLowerCase();
    const isTarimaAbierta = (estado?: string | null) => {
        const normalized = normalizeTarimaEstado(estado);
        return normalized === "1" || normalized === "abierta" || normalized === "abierto";
    };

    const reopenTarimaIfNeeded = async (tarimaId: number) => {
        let estadoActual = selectedTarimaDetalle?.tarimaId === tarimaId ? selectedTarimaDetalle.estado : null;

        if (!estadoActual) {
            const detailResponse = await fetch(`${API_BASE_URL}/Verificacion/tarima/${tarimaId}`);
            if (!detailResponse.ok) {
                throw new Error(await parseApiError(detailResponse, `Error (${detailResponse.status}) al validar la tarima.`));
            }
            const detailData: TarimaActivaDetalle = await detailResponse.json();
            estadoActual = detailData.estado;
            setTarimaActivaDetalle(detailData);
        }

        if (isTarimaAbierta(estadoActual)) return false;

        const reopenResponse = await fetch(`${API_BASE_URL}/Verificacion/reabrir-tarima/${tarimaId}`, {
            method: "PUT",
        });
        if (!reopenResponse.ok) {
            throw new Error(await parseApiError(reopenResponse, `Error (${reopenResponse.status}) al reabrir tarima.`));
        }

        await Promise.all([
            fetchTarimasActivas(),
            fetchTarimasTerminadas(),
            fetchDashboardData({ silent: true }),
            fetchTarimaActivaDetalle(tarimaId),
        ]);

        return true;
    };

    const resetScanForm = () => {
        setTrazabilidadInput("");
        setConsecutivoManualInput("");
        setSelectedDestinyCaja(null);
        setDestinySearchByMachine({});
        const fixedQty = Number(dashboardData?.piezasPorCaja ?? 0);
        setQtyUomEtiquetaInput(fixedQty > 0 ? String(fixedQty) : "");
        setPiezasAuditadasInput("");
        setTieneDefectosInput(false);
        setOpenDefectoIndex(null);
        setDefectosCajaInput([{ defectoId: null, cantidad: "", comentario: "" }]);
    };

    const registerCajaDefectos = async ({
        detalleId,
        tarimaId,
        numeroCaja,
        defectosCapturados,
    }: {
        detalleId: number;
        tarimaId: number;
        numeroCaja: number;
        defectosCapturados: DefectoCajaInputItem[];
    }) => {
        const defectosPayload = defectosCapturados.map((item) => ({
            defectoId: Number(item.defectoId),
            cantidad: Number(item.cantidad),
            comentario: item.comentario.trim() || null,
        }));

        const defectosResponse = await fetch(`${API_BASE_URL}/Verificacion/registrar-defectos-caja`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tarimaId,
                verificacionId: verifiedIdNumber,
                detalleId,
                numeroCaja,
                defectos: defectosPayload,
            }),
        });

        if (!defectosResponse.ok) {
            throw new Error(
                await parseApiError(defectosResponse, `Error (${defectosResponse.status}) al registrar defectos de la caja.`)
            );
        }
    };

    const handleCreateTarima = async () => {
        setCreateTarimaError(null);
        setCreateTarimaSuccess(null);
        setIsCreatingTarima(true);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/iniciar-tarima`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    verificacionId: verifiedIdNumber,
                    usuario: currentUserName,
                }),
            });
            if (!response.ok) {
                let detail = `Error (${response.status}) al crear tarima.`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            detail = errorData.detail || errorData.message || errorData.error || detail;
                        } catch {
                            detail = errorText;
                        }
                    }
                } catch {
                    // ignore parse error
                }
                throw new Error(detail);
            }

            await response.json().catch(() => null);

            setCreateTarimaSuccess("Tarima creada correctamente.");
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData({ silent: true });
        } catch (err: any) {
            setCreateTarimaError(err.message || "Error de conexión al crear tarima.");
        } finally {
            setIsCreatingTarima(false);
        }
    };

    const handleDeleteTarima = async (tarimaId: number) => {
        setIsDeletingTarima(true);
        setDeleteTarimaError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/Verificacion/eliminar-tarima/${tarimaId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                let detail = `Error (${res.status}) al eliminar tarima.`;
                try {
                    const text = await res.text();
                    if (text) {
                        try { const j = JSON.parse(text); detail = j.detail || j.message || j.error || detail; }
                        catch { detail = text; }
                    }
                } catch { /* ignore */ }
                throw new Error(detail);
            }
            // Actualizar UI directamente sin F5
            setTarimasActivas((prev) => prev.filter((t) => t.tarimaId !== tarimaId));
            if (selectedTarima?.tarimaId === tarimaId) setSelectedTarima(null);
            setDeleteTarimaConfirmId(null);
            refreshVerificationData({ includeTerminadas: false, tarimaId: null });
        } catch (err: any) {
            setDeleteTarimaError(err.message || "Error de conexión al eliminar tarima.");
        } finally {
            setIsDeletingTarima(false);
        }
    };

    const openEvidenceForCaja = (detalleId: number) => {
        setEvidenceTargetId(detalleId);
        setEvidenceError(null);
        setEvidenceSuccess(null);
        setSelectedEvidenceFiles([]);
        setIsEvidenceModalOpen(true);
        // Solo volver a fetchear si no hay datos cacheados válidos para este detalle
        const cached = evidenceByDetalleId[detalleId];
        if (!cached?.length) {
            void fetchCajaEvidencias(detalleId).catch((err: any) => {
                setEvidenceError(err.message || "No se pudieron cargar las fotos de la caja.");
            });
        }
    };

    const handleRegisterScan = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedTarima) return;

        setRegisterError(null);
        setRegisterSuccess(null);
        setRegisterStatusMessage(null);

        const isBioflex = currentVerificationType === "BIOFLEX";
        const isDestiny = currentVerificationType === "DESTINY";

        if (isBioflex && !trazabilidadInput) {
            setRegisterError("Ingrese la trazabilidad para registrar la caja.");
            return;
        }

        if (isDestiny && !selectedDestinyCaja?.trazabilidad) {
            setRegisterError("Seleccione una caja disponible de Destiny antes de registrar.");
            return;
        }

        if (!isBioflex && !isDestiny && !consecutivoManualInput) {
            setRegisterError("Ingrese el consecutivo manual para registrar la caja.");
            return;
        }

        if (!qtyUomEtiquetaInput) {
            setRegisterError("No se encontro la cantidad de piezas por caja para esta verificación.");
            return;
        }

        if (!piezasAuditadasInput) {
            setRegisterError("Ingrese las piezas auditadas.");
            return;
        }

        const qtyUomValue = Number(qtyUomEtiquetaInput);
        const piezasAuditadasValue = Number(piezasAuditadasInput);

        if (!Number.isFinite(qtyUomValue) || qtyUomValue <= 0) {
            setRegisterError("Las piezas por caja (Qty UOM) deben ser un número mayor a 0.");
            return;
        }

        if (!Number.isFinite(piezasAuditadasValue) || piezasAuditadasValue <= 0) {
            setRegisterError("Las piezas auditadas deben ser un número mayor a 0.");
            return;
        }

        if (piezasAuditadasValue > qtyUomValue) {
            setRegisterError("Las piezas auditadas no pueden ser mayores que las piezas por caja.");
            return;
        }

        const defectosCapturados = defectosCajaInput.filter((item) =>
            item.defectoId !== null || item.cantidad.trim() !== "" || item.comentario.trim() !== ""
        );
        if (tieneDefectosInput) {
            if (defectosCapturados.length === 0) {
                setRegisterError("Agregue al menos un defecto para la caja.");
                return;
            }
            for (const item of defectosCapturados) {
                const cantidad = Number(item.cantidad);
                if (!item.defectoId) {
                    setRegisterError("Seleccione el defecto en cada registro capturado.");
                    return;
                }
                if (!Number.isFinite(cantidad) || cantidad <= 0) {
                    setRegisterError("La cantidad afectada debe ser mayor a 0 en cada defecto.");
                    return;
                }
            }
        }

        const tipoEtiqueta = isDestiny ? "Trazable" : currentVerificationType;
        const trazabilidadPayload = isBioflex
            ? trazabilidadInput
            : isDestiny
              ? selectedDestinyCaja?.trazabilidad ?? null
              : null;
        const consecutivoManualPayload = isBioflex || isDestiny ? 0 : Number(consecutivoManualInput);

        const payload: Record<string, any> = {
            verificacionId: verifiedIdNumber,
            tarimaId: selectedTarima.tarimaId,
            trazabilidad: trazabilidadPayload,
            consecutivoManual: consecutivoManualPayload,
            qtyUomEtiqueta: qtyUomEtiquetaInput,
            tipoEtiqueta,
            piezasAuditadas: piezasAuditadasValue,
            usuario: user?.name ?? "",
        };

        setIsRegisteringScan(true);

        try {
            const tarimaFueReabierta = await reopenTarimaIfNeeded(selectedTarima.tarimaId);
            const response = await fetch(`${API_BASE_URL}/Verificacion/registrar-escaneo`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, `Error (${response.status}) al registrar caja.`));
            }

            const data: RegistrarEscaneoResponse = await response.json();

            if (data?.requiereConfirmacion) {
                const detalleIdDuplicado = Number(data.detalleIdDuplicado);
                if (!Number.isFinite(detalleIdDuplicado) || detalleIdDuplicado <= 0) {
                    throw new Error("La API indico duplicado, pero no regreso un detalleIdDuplicado valido.");
                }

                const shouldRescan = window.confirm(
                    data.mensajeConfirmacion || "La caja ya fue registrada. Deseas reescanearla?"
                );
                if (!shouldRescan) {
                    if (tarimaFueReabierta) {
                        setRegisterStatusMessage("Tarima reabierta. Reescaneo cancelado por el operador.");
                    }
                    return;
                }

                const reescanResponse = await fetch(
                    `${API_BASE_URL}/Verificacion/reescanear-caja/${detalleIdDuplicado}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );
                if (!reescanResponse.ok) {
                    throw new Error(
                        await parseApiError(reescanResponse, `Error (${reescanResponse.status}) al reescanear la caja.`)
                    );
                }

                const reescanData: ReescanearCajaResponse = await reescanResponse.json();
                setLastDetalleId(Number(reescanData.detalleId));

                if (tieneDefectosInput) {
                    const matchedCaja = selectedTarimaDetalle?.cajas.find((caja) => caja.detalleId === reescanData.detalleId);
                    const numeroCajaReescaneada =
                        Number(
                            matchedCaja?.identificador?.match(/#\s*(\d+)/)?.[1] ??
                            reescanData.identificador?.match(/#\s*(\d+)/)?.[1]
                        ) || 0;

                    await registerCajaDefectos({
                        detalleId: reescanData.detalleId,
                        tarimaId: selectedTarima.tarimaId,
                        numeroCaja: numeroCajaReescaneada,
                        defectosCapturados,
                    });
                    fetchDefectosResumen();
                }

                setRegisterSuccess("Caja reescaneada correctamente.");
                setRegisterStatusMessage(
                    tarimaFueReabierta
                        ? `Tarima reabierta y ${reescanData.identificador} actualizada correctamente.`
                        : `${reescanData.identificador} actualizada correctamente.`
                );
                resetScanForm();
                fetchTarimaActivaDetalle(selectedTarima.tarimaId);
                fetchTarimasActivas();
                fetchDashboardData({ silent: true });
                if (isDestiny) {
                    fetchDestinyCajasDisponibles(String(dashboardData?.loteOrden ?? ""), { silent: true });
                }

                if (tieneDefectosInput) {
                    setEvidenceTargetId(Number(reescanData.detalleId));
                    setIsEvidenceModalOpen(true);
                }
                return;
            }

            setRegisterSuccess("Caja registrada correctamente.");
            if (data?.mensajeEstado) {
                setRegisterStatusMessage(
                    tarimaFueReabierta ? `Tarima reabierta. ${data.mensajeEstado}` : data.mensajeEstado
                );
            } else if (tarimaFueReabierta) {
                setRegisterStatusMessage("Tarima reabierta y caja registrada correctamente.");
            }
            if (data?.ultimoDetalleId) {
                setLastDetalleId(Number(data.ultimoDetalleId));
            } else {
                setLastDetalleId(null);
            }

            const numeroCaja = Number(data?.numeroCaja ?? selectedTarima.cajasLlevamos + 1);
            if (tieneDefectosInput && data?.ultimoDetalleId) {
                await registerCajaDefectos({
                    detalleId: Number(data.ultimoDetalleId),
                    tarimaId: selectedTarima.tarimaId,
                    numeroCaja,
                    defectosCapturados,
                });
                fetchDefectosResumen();
                setRegisterStatusMessage(
                    tarimaFueReabierta
                        ? `Tarima reabierta. Caja #${numeroCaja} escaneada y defectos registrados.`
                        : `Caja #${numeroCaja} escaneada y defectos registrados.`
                );
            } else {
                setRegisterStatusMessage(
                    tarimaFueReabierta
                        ? `Tarima reabierta. Caja #${numeroCaja} escaneada correctamente.`
                        : `Caja #${numeroCaja} escaneada correctamente.`
                );
            }

            resetScanForm();
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchTarimaActivaDetalle(selectedTarima.tarimaId);
            fetchDashboardData();
            if (isDestiny) {
                fetchDestinyCajasDisponibles(String(dashboardData?.loteOrden ?? ""), { silent: true });
            }

            if (tieneDefectosInput && data?.ultimoDetalleId) {
                setEvidenceTargetId(Number(data.ultimoDetalleId));
                setIsEvidenceModalOpen(true);
            }
        } catch (err: any) {
            setRegisterError(err.message || "Error de conexión al registrar la caja.");
        } finally {
            setIsRegisteringScan(false);
        }
    };

    const handleEvidenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        if (!files.length) return;
        setSelectedEvidenceFiles((prev) => {
            const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const nextFiles = files.filter(
                (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
            );
            return [...prev, ...nextFiles];
        });
        event.target.value = "";
    };

    const handleRemoveEvidenceFile = (fileIndex: number) => {
        setSelectedEvidenceFiles((prev) => prev.filter((_, index) => index !== fileIndex));
    };

    const handleEvidenceSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setEvidenceError(null);
        setEvidenceSuccess(null);

        if (!selectedEvidenceFiles.length) {
            setEvidenceError("Seleccione al menos una foto.");
            return;
        }

        const activeDetalleId = evidenceTargetId ?? lastDetalleId;
        if (!activeDetalleId) {
            setEvidenceError("No se encontro el detalle para asociar la evidencia.");
            return;
        }

        setIsEvidenceUploading(true);

        try {
            const formData = new FormData();
            selectedEvidenceFiles.forEach((file) => formData.append("foto", file));

            const response = await fetch(`${API_BASE_URL}/Verificacion/fotos-caja/${activeDetalleId}`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, `Error (${response.status}) al subir evidencia.`));
            }

            setEvidenceSuccess("Evidencia subida correctamente.");
            setSelectedEvidenceFiles([]);
            await fetchCajaEvidencias(activeDetalleId);
            if (selectedTarima) {
                fetchTarimaActivaDetalle(selectedTarima.tarimaId);
            }
            fetchTarimasTerminadas();
        } catch (err: any) {
            setEvidenceError(err.message || "Error de conexión al subir la evidencia.");
        } finally {
            setIsEvidenceUploading(false);
        }
    };

    const handleDeleteEvidence = async (detalleId: number, evidenciaId: number) => {
        setEvidenceError(null);
        setEvidenceSuccess(null);
        setDeletingEvidenceId(evidenciaId);

        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/fotos-caja/${evidenciaId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(await parseApiError(response, `Error (${response.status}) al eliminar la foto.`));
            }

            setEvidenceByDetalleId((prev) => ({
                ...prev,
                [detalleId]: (prev[detalleId] ?? []).filter((item) => item.evidenciaId !== evidenciaId),
            }));
            setEvidenceSuccess("Foto eliminada correctamente.");
            if (selectedTarima) {
                fetchTarimaActivaDetalle(selectedTarima.tarimaId);
            }
            fetchTarimasTerminadas();
        } catch (err: any) {
            setEvidenceError(err.message || "Error de conexiÃ³n al eliminar la foto.");
        } finally {
            setDeletingEvidenceId(null);
        }
    };

    const handleCloseTarimaSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedTarima) return;

        setCloseTarimaError(null);
        setCloseTarimaSuccess(null);

        if (!closeTarimaEstatusCierre) {
            setCloseTarimaError("Seleccione el estatus de cierre.");
            return;
        }

        setIsClosingTarima(true);

        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/terminar-tarima-manual`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    verificacionId: verifiedIdNumber,
                    tarimaId: selectedTarima.tarimaId,
                    estatusCierre: closeTarimaEstatusCierre,
                    motivo: closeTarimaAgregarComentario ? closeTarimaComentario.trim() : "",
                }),
            });

            if (!response.ok) {
                let detail = `Error (${response.status}) al cerrar tarima.`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            detail = errorData.detail || errorData.message || detail;
                        } catch {
                            detail = errorText;
                        }
                    }
                } catch {
                    // ignore parse error
                }
                throw new Error(detail);
            }

            setCloseTarimaSuccess("Tarima cerrada correctamente.");
            setCloseTarimaEstatusCierre("");
            setCloseTarimaAgregarComentario(false);
            setCloseTarimaComentario("");
            setTimeout(() => setIsCloseTarimaModalOpen(false), 600);
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
            setSelectedTarima(null);
        } catch (err: any) {
            setCloseTarimaError(err.message || "Error de conexión al cerrar tarima.");
        } finally {
            setIsClosingTarima(false);
        }
    };

    const handleReopenTarima = async (tarima: TarimaTerminada) => {
        setReopenTarimaError(null);
        setReopenTarimaSuccess(null);

        if (!isAdminUser) {
            setReopenTarimaError("Solo los administradores pueden reabrir una tarima.");
            return;
        }

        const shouldContinue = window.confirm(`Se reabrira la tarima #${tarima.numeroTarima}. Desea continuar?`);
        if (!shouldContinue) return;

        setReopeningTarimaId(tarima.tarimaId);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/reabrir-tarima/${tarima.tarimaId}`, {
                method: "PUT",
            });
            if (!response.ok) {
                let detail = `Error (${response.status}) al reabrir tarima.`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            detail = errorData.detail || errorData.message || errorData.error || detail;
                        } catch {
                            detail = errorText;
                        }
                    }
                } catch {
                    // ignore parse error
                }
                throw new Error(detail);
            }

            setReopenTarimaSuccess(`Tarima #${tarima.numeroTarima} reabierta correctamente.`);
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
        } catch (err: any) {
            setReopenTarimaError(err.message || "Error de conexión al reabrir la tarima.");
        } finally {
            setReopeningTarimaId(null);
        }
    };

    const handleDeleteCajaTarimaActiva = async (detalleId: number, tarimaId: number) => {
        setDeleteCajaError(null);
        setDeleteCajaSuccess(null);
        const shouldContinue = window.confirm("Se eliminara la caja de la tarima activa. Desea continuar?");
        if (!shouldContinue) return;

        setDeletingCajaId(detalleId);
        try {
            const res = await fetch(`${API_BASE_URL}/Verificacion/eliminar-caja/${detalleId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                let detail = `Error (${res.status}) al eliminar caja.`;
                try {
                    const errorText = await res.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            detail = errorData.detail || errorData.message || errorData.error || detail;
                        } catch {
                            detail = errorText;
                        }
                    }
                } catch {
                    // ignore parse error
                }
                throw new Error(detail);
            }

            setDeleteCajaSuccess("Caja eliminada correctamente.");
            // Quitar la caja del estado local inmediatamente (optimistic update)
            setTarimaActivaDetalle(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    cajasEscaneadas: prev.cajasEscaneadas - 1,
                    cajas: prev.cajas.filter(c => c.detalleId !== detalleId),
                };
            });
            fetchTarimasActivas();
            fetchTarimaActivaDetalle(tarimaId);
            fetchDashboardData();
            fetchDefectosResumen();
        } catch (err: any) {
            setDeleteCajaError(err.message || "Error de conexión al eliminar la caja.");
        } finally {
            setDeletingCajaId(null);
        }
    };

    const handleFinishSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFinishError(null);
        setFinishSuccess(null);

        if (!finishMuestreo || !finishComentarios) {
            setFinishError("Complete todos los campos para finalizar la verificación.");
            return;
        }

        setIsFinishing(true);

        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/terminar`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    verificacionId: verifiedIdNumber,
                    muestreo: finishMuestreo,
                    comentarios: finishComentarios,
                }),
            });

            if (!response.ok) {
                let detail = `Error (${response.status}) al finalizar la verificación.`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            detail = errorData.detail || errorData.message || errorData.error || detail;
                        } catch {
                            detail = errorText;
                        }
                    }
                } catch {
                    // ignore parse error
                }
                throw new Error(detail);
            }

            setFinishSuccess("Verificación finalizada correctamente.");
            setFinishMuestreo("");
            setFinishComentarios("");
            fetchDashboardData();
            setIsFinishModalOpen(false);
            router.push("/dashboard/pendientes"); // Redirigir al finalizar
        } catch (err: any) {
            setFinishError(err.message || "Error de conexión al finalizar la verificación.");
        } finally {
            setIsFinishing(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">

            {/* Header */}
            <div className="space-y-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => {
                        if (selectedTarima && !window.confirm("Hay una tarima activa. ¿Deseas salir de todas formas?")) return;
                        router.push("/dashboard/pendientes");
                    }}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Card className="border-0 shadow-md bg-card">
                    <CardContent className="p-4 space-y-3">
                        {/* Fila superior: estado + ID */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                                    dashboardData.estado === "EN PROCESO"
                                        ? "bg-primary/15 text-primary"
                                        : "bg-muted text-muted-foreground"
                                }`}>
                                    {dashboardData.estado}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                    Verificación #{dashboardData.verificacionId}
                                </span>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                dashboardData.cliente === "BIOFLEX" ? "bg-blue-100 text-blue-700" :
                                dashboardData.cliente === "DESTINY" ? "bg-purple-100 text-purple-700" :
                                "bg-green-100 text-green-700"
                            }`}>
                                {dashboardData.cliente}
                            </span>
                        </div>

                        {/* Nombre del producto */}
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Producto</p>
                                {(dashboardData.claveProducto ?? dashboardData.productoInfo?.split(" — ")[0]) && (
                                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                                        {dashboardData.claveProducto ?? dashboardData.productoInfo?.split(" — ")[0]}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-lg font-bold text-foreground leading-snug">
                                {dashboardData.nombreProducto ?? dashboardData.productoInfo ?? "—"}
                            </h1>
                        </div>

                        {/* Datos de la orden */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border md:grid-cols-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orden</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.loteOrden}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Piezas del pedido</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.piezasMeta.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tarimas est.</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.tarimasTotalesEstimadas}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuario</p>
                                <p className="text-sm font-bold mt-0.5 break-words">{currentUserName}</p>
                            </div>
                        </div>

                        {dashboardData.printCard && (
                            <div className="mt-1 space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={handleOpenPrintCard}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver PrintCard · {dashboardData.printCard}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={handleOpenFichaTecnica}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver Ficha Tecnica · {dashboardData.printCard}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* KPIs */}
            <div className="space-y-3">
                <Card className="border-0 shadow-md bg-card">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <span className="font-semibold text-foreground">Avance general</span>
                            </div>
                            <span className="text-4xl font-bold text-primary">{dashboardData.porcentajeAvance}%</span>
                        </div>
                        <div className="h-4 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${dashboardData.porcentajeAvance}%` }}
                            />
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-muted-foreground">Cajas registradas</span>
                                <span className="text-foreground">
                                    {dashboardData.cajasActuales}
                                    {cajasMetaEstimadas ? ` / ${cajasMetaEstimadas}` : ""}
                                </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${cajasProgress}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-0 shadow-md bg-card text-center">
                        <CardContent className="p-4">
                            <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold">{dashboardData.cajasActuales}</p>
                            <p className="text-xs text-muted-foreground">Cajas · {dashboardData.piezasActuales} pz</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-md bg-card text-center">
                        <CardContent className="p-4">
                            <Truck className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold">
                                {dashboardData.tarimasActuales}
                                <span className="text-sm font-normal text-muted-foreground">/{dashboardData.tarimasTotalesEstimadas}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Tarimas</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-md bg-card text-center">
                        <CardContent className="p-4">
                            <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                            <p className="text-2xl font-bold">{dashboardData.tiempoTranscurridoMinutos}</p>
                            <p className="text-xs text-muted-foreground">Min</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* PASO 1: Seleccionar Tarima */}
            <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shrink-0">
                                1
                            </div>
                            <div>
                                <CardTitle className="text-lg">Seleccionar Tarima</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Cree o elija una tarima activa</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    fetchTarimasActivas();
                                    fetchTarimasTerminadas();
                                    if (selectedTarima) fetchTarimaActivaDetalle(selectedTarima.tarimaId);
                                }}
                                disabled={isTarimasLoading}
                                className="h-12 px-3 text-sm"
                            >
                                {isTarimasLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refrescar"}
                            </Button>
                            <Button
                                className="h-12 px-4 text-sm font-semibold"
                                onClick={handleCreateTarima}
                                disabled={isCreatingTarima || dashboardData.estado !== "EN PROCESO"}
                            >
                                {isCreatingTarima ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Creando...</> : "+ Nueva Tarima"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {createTarimaError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {createTarimaError}
                        </div>
                    )}
                    {createTarimaSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                            <CheckSquare className="w-4 h-4 shrink-0" />
                            {createTarimaSuccess}
                        </div>
                    )}
                    {tarimasError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {tarimasError}
                        </div>
                    )}
                    {deleteCajaError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {deleteCajaError}
                        </div>
                    )}
                    {deleteCajaSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                            <Check className="w-4 h-4 shrink-0" />
                            {deleteCajaSuccess}
                        </div>
                    )}
                    {!isTarimasLoading && !tarimasError && tarimasActivas.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                            <Truck className="w-10 h-10 opacity-25" />
                            <p className="text-sm">No hay tarimas activas. Pulse "+ Nueva Tarima".</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tarimasActivas.map((tarima) => {
                            const isSelected = selectedTarima?.tarimaId === tarima.tarimaId;
                            const progress = tarima.meta > 0
                                ? Math.min(100, (tarima.cajasLlevamos / tarima.meta) * 100)
                                : 0;
                            return (
                                <div
                                    key={tarima.tarimaId}
                                    className={`rounded-xl border-2 p-5 text-left transition-all ${
                                        isSelected
                                            ? "border-primary bg-primary/10 shadow-md"
                                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTarima(tarima)}
                                        className="w-full text-left [touch-action:manipulation]"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tarima</p>
                                                <p className="text-3xl font-bold mt-0.5">#{tarima.numeroTarima}</p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${
                                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {isSelected ? "Activa" : "Seleccionar"}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm font-medium">
                                                <span>{tarima.cajasLlevamos} / {tarima.meta} cajas</span>
                                                <span className="text-primary font-bold">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </button>
                                    <div className="mt-3 flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Por: {tarima.usuarioCreo}</p>
                                        <div className="flex items-center gap-1">
                                            {tarima.cajasLlevamos === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarimaError(null); setDeleteTarimaConfirmId(tarima.tarimaId); }}
                                                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10 min-h-[44px] [touch-action:manipulation]"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {selectedTarima && (
                <Card className="border-0 shadow-lg bg-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg">Cajas en Tarima Activa</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tarima #{selectedTarima.numeroTarima}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchTarimaActivaDetalle(selectedTarima.tarimaId)}
                                disabled={isTarimaActivaDetalleLoading}
                                className="h-9 px-3 text-sm"
                            >
                                {isTarimaActivaDetalleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refrescar"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {tarimaActivaDetalleError && (
                            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                {tarimaActivaDetalleError}
                            </div>
                        )}
                        {!isTarimaActivaDetalleLoading && selectedTarimaDetalle?.colaboradores && selectedTarimaDetalle.colaboradores.length > 0 && (
                            <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Colaboradores</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTarimaDetalle.colaboradores.map((col) => (
                                        <div key={col.usuario} className="flex items-center gap-1.5 text-xs bg-card border border-border rounded-full px-2.5 py-1">
                                            <span className="font-medium">{col.usuario}</span>
                                            <span className="text-muted-foreground">{col.cajasEscaneadas} cjas</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!isTarimaActivaDetalleLoading && !tarimaActivaDetalleError && selectedTarimaDetalle?.cajas?.length === 0 && (
                            <p className="text-sm text-muted-foreground">Sin cajas escaneadas en esta tarima.</p>
                        )}
                        {isTarimaActivaDetalleLoading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cargando cajas...
                            </div>
                        )}
                        {!isTarimaActivaDetalleLoading && selectedTarimaDetalle?.cajas?.length ? (
                            <div className="max-h-96 overflow-y-auto pr-1 space-y-2">
                                {selectedTarimaDetalle.cajas.map((caja) => (
                                    <div key={caja.detalleId} className="rounded-md border border-border px-3 py-2.5 bg-card">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{caja.identificador}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {caja.cantidad} pz · {caja.piezasAuditadas} auditadas
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {new Date(caja.horaEscaneo).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {caja.tieneDefectos && (
                                                    <span className="text-[10px] font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                                        Con defecto
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEvidenceForCaja(caja.detalleId)}
                                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary px-2 py-1 rounded hover:bg-primary/10"
                                                    title="Gestionar fotos"
                                                >
                                                    <Camera className="w-3.5 h-3.5" />
                                                    Fotos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCajaTarimaActiva(caja.detalleId, selectedTarima.tarimaId)}
                                                    disabled={deletingCajaId === caja.detalleId}
                                                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive px-2 py-1 rounded hover:bg-destructive/10 disabled:opacity-60"
                                                >
                                                    {deletingCajaId === caja.detalleId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                        {caja.tieneDefectos && Array.isArray(caja.defectos) && caja.defectos.length > 0 && (
                                            <details className="mt-2 text-xs">
                                                <summary className="cursor-pointer text-destructive font-medium">
                                                    Ver defectos ({caja.defectos.length})
                                                </summary>
                                                <div className="mt-1 space-y-1 text-muted-foreground">
                                                    {caja.defectos.map((defecto, idx) => (
                                                        <p key={`${caja.detalleId}-defecto-${idx}`}>
                                                            {defecto.detalle} · {defecto.familia} · {defecto.cantidad}
                                                            {defecto.comentario ? ` · ${defecto.comentario}` : ""}
                                                        </p>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                        {renderEvidenceGallery(caja.detalleId, caja.fotos, { editable: true, showManageButton: false })}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            )}

            {selectedTarima && (
                <Card className="border-2 border-primary/30 shadow-xl bg-card">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shrink-0">
                                2
                            </div>
                            <div>
                                <CardTitle className="text-lg">Registrar Caja</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tarima #{selectedTarima.numeroTarima} · {selectedTarima.cajasLlevamos} / {selectedTarima.meta} cajas registradas
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegisterScan} className="space-y-5">
                            {currentVerificationType === "BIOFLEX" ? (
                                <div className="space-y-2">
                                    <Label htmlFor="trazabilidad" className="text-base font-medium">Trazabilidad</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="trazabilidad"
                                            className="h-14 text-base"
                                            value={trazabilidadInput}
                                            onChange={(e) => setTrazabilidadInput(e.target.value)}
                                            placeholder="Escanee o ingrese la trazabilidad"
                                            disabled={isRegisteringScan}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-14 w-14 shrink-0"
                                            onClick={() => setIsQrScannerOpen(true)}
                                            disabled={isRegisteringScan}
                                            title="Escanear QR"
                                        >
                                            <ScanLine className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            ) : currentVerificationType === "DESTINY" ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <Label className="text-base font-medium">Caja Destiny</Label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground">
                                                    Seleccione la trazabilidad exacta a revisar en esta tarima.
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0"
                                                    onClick={() => setIsDestinyUpdateHelpOpen(true)}
                                                    aria-label="Ver actualización de Destiny"
                                                >
                                                    <HelpCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fetchDestinyCajasDisponibles(String(dashboardData?.loteOrden ?? ""))}
                                            disabled={isRegisteringScan || isDestinyCajasLoading}
                                        >
                                            {isDestinyCajasLoading ? "Cargando..." : "Actualizar"}
                                        </Button>
                                    </div>

                                    {destinyCajasDisponibles && (
                                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">Orden {destinyCajasDisponibles.orden}</Badge>
                                                <Badge variant="outline">{destinyCajasDisponibles.totalCajas} cajas</Badge>
                                            </div>
                                            <p className="mt-2 text-sm font-medium text-foreground">
                                                {destinyCajasDisponibles.nombreProducto}
                                            </p>
                                        </div>
                                    )}

                                    {destinyCajasError && (
                                        <p className="text-sm text-destructive">{destinyCajasError}</p>
                                    )}

                                    {isDestinyCajasLoading ? (
                                        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                            Cargando cajas disponibles...
                                        </div>
                                    ) : destinyCajasDisponibles?.maquinas?.length ? (
                                        <Accordion type="single" collapsible className="w-full rounded-xl border border-border px-4" value={openMaquinaAccordion} onValueChange={setOpenMaquinaAccordion}>
                                            {destinyCajasDisponibles.maquinas.map((maquina) => {
                                                const tieneSeleccionada = selectedDestinyCaja
                                                    ? maquina.cajas.some(c => c.trazabilidad === selectedDestinyCaja.trazabilidad)
                                                    : false;
                                                return (
                                                <AccordionItem key={`maquina-${maquina.noMaquina}`} value={`maquina-${maquina.noMaquina}`}>
                                                    <AccordionTrigger className="text-left">
                                                        <div className="flex flex-1 flex-wrap items-center gap-2 pr-4">
                                                            <span className="font-semibold">Máquina {maquina.noMaquina}</span>
                                                            <Badge variant="outline">{maquina.totalCajas} cajas</Badge>
                                                            <Badge variant="secondary">{maquina.cajasRevisadas} revisadas</Badge>
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
                                                                    value={destinySearchByMachine[maquina.noMaquina] ?? ""}
                                                                    onChange={(e) =>
                                                                        setDestinySearchByMachine((current) => ({
                                                                            ...current,
                                                                            [maquina.noMaquina]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder="Buscar por consecutivo o trazabilidad"
                                                                    className="h-11 pl-9"
                                                                    disabled={isRegisteringScan}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                                            {maquina.cajas
                                                                .filter((caja) => {
                                                                    const query = (destinySearchByMachine[maquina.noMaquina] ?? "").trim();
                                                                    if (!query) return true;
                                                                    const consecutivo = caja.trazabilidad.slice(-3);
                                                                    const haystack = `${caja.trazabilidad} ${consecutivo}`.toLowerCase();
                                                                    return haystack.includes(query.toLowerCase());
                                                                })
                                                                .map((caja) => {
                                                                const isSelected = selectedDestinyCaja?.trazabilidad === caja.trazabilidad;
                                                                const consecutivo = caja.trazabilidad.slice(-3);
                                                                return (
                                                                    <button
                                                                        key={caja.trazabilidad}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (caja.yaRevisada || isRegisteringScan) return;
                                                                            setSelectedDestinyCaja(caja);
                                                                            setTrazabilidadInput(caja.trazabilidad);
                                                                            setPiezasAuditadasInput(String(caja.piezas));
                                                                            setRegisterError(null);
                                                                            setOpenMaquinaAccordion("");
                                                                        }}
                                                                        disabled={caja.yaRevisada || isRegisteringScan}
                                                                        className={`rounded-xl border p-3 text-left transition-colors ${
                                                                            caja.yaRevisada
                                                                                ? "cursor-not-allowed border-border/60 bg-muted/30 opacity-70"
                                                                                : isSelected
                                                                                  ? "border-primary bg-primary/10 shadow-sm"
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
                                                                            {caja.yaRevisada ? (
                                                                                <Badge variant="secondary">Revisada</Badge>
                                                                            ) : isSelected ? (
                                                                                <Badge>Seleccionada</Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                            </div>
                                                            {maquina.cajas.filter((caja) => {
                                                                const query = (destinySearchByMachine[maquina.noMaquina] ?? "").trim();
                                                                if (!query) return false;
                                                                const consecutivo = caja.trazabilidad.slice(-3);
                                                                const haystack = `${caja.trazabilidad} ${consecutivo}`.toLowerCase();
                                                                return haystack.includes(query.toLowerCase());
                                                            }).length === 0 && (
                                                                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                                                    No hay cajas que coincidan con esa búsqueda en la máquina {maquina.noMaquina}.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                                );
                                            })}
                                        </Accordion>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                            No hay cajas disponibles para esta orden.
                                        </div>
                                    )}

                                    {selectedDestinyCaja && (
                                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                                            <p className="text-sm font-semibold text-foreground">Caja seleccionada</p>
                                            <p className="mt-1 text-sm text-muted-foreground break-all">
                                                {selectedDestinyCaja.trazabilidad}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="consecutivo" className="text-base font-medium">Consecutivo Manual</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setIsConsecutivoHelpOpen(true)}
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Input
                                        id="consecutivo"
                                        type="number"
                                        inputMode="numeric"
                                        className="h-14 text-base"
                                        value={consecutivoManualInput}
                                        onChange={(e) => setConsecutivoManualInput(e.target.value)}
                                        placeholder="Ingrese el consecutivo manual"
                                        disabled={isRegisteringScan}
                                        min="1"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="qtyUomEtiqueta" className="text-base font-medium">Piezas por Caja</Label>
                                        {currentVerificationType === "DESTINY" && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setIsPzasCajaHelpOpen(true)}
                                            >
                                                <HelpCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="qtyUomEtiqueta"
                                            type="number"
                                            inputMode="numeric"
                                            className="h-14 text-base flex-1"
                                            value={qtyUomEtiquetaInput}
                                            onChange={(e) => {
                                                setQtyUomEtiquetaInput(e.target.value);
                                                setQtyUomScanError(null);
                                            }}
                                            placeholder="Valor fijo"
                                            disabled={true}
                                            readOnly
                                            min="1"
                                        />
                                        {currentVerificationType === "DESTINY" && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-14 w-14 shrink-0"
                                                onClick={handleQtyUomCaptureClick}
                                                disabled={isRegisteringScan}
                                                aria-label="Escanear codigo de barras"
                                            >
                                                <Camera className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                    {qtyUomScanError && (
                                        <p className="text-xs text-destructive">{qtyUomScanError}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Valor fijo: {qtyUomEtiquetaInput || "—"}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="piezasAuditadas" className="text-base font-medium">Piezas Auditadas</Label>
                                    <Input
                                        id="piezasAuditadas"
                                        type="number"
                                        inputMode="numeric"
                                        className="h-14 text-base"
                                        value={piezasAuditadasInput}
                                        onChange={(e) => setPiezasAuditadasInput(e.target.value)}
                                        placeholder="Piezas revisadas"
                                        disabled={isRegisteringScan}
                                        min="1"
                                        max={
                                            qtyUomEtiquetaInput && Number.isFinite(Number(qtyUomEtiquetaInput))
                                                ? Number(qtyUomEtiquetaInput)
                                                : undefined
                                        }
                                    />
                                    {qtyUomEtiquetaInput && Number.isFinite(Number(qtyUomEtiquetaInput)) && (
                                        <p className="text-xs text-muted-foreground">
                                            Máximo: {Number(qtyUomEtiquetaInput)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Toggle defectos */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isRegisteringScan) return;
                                        const nextValue = !tieneDefectosInput;
                                        setTieneDefectosInput(nextValue);
                                        if (!nextValue) {
                                            setOpenDefectoIndex(null);
                                            setDefectosCajaInput([{ defectoId: null, cantidad: "", comentario: "" }]);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
                                        tieneDefectosInput
                                            ? "border-destructive bg-destructive/10"
                                            : "border-border bg-muted/30 hover:border-muted-foreground/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                            tieneDefectosInput ? "border-destructive bg-destructive" : "border-muted-foreground/40"
                                        }`}>
                                            {tieneDefectosInput && <Check className="w-4 h-4 text-destructive-foreground" />}
                                        </div>
                                        <span className={`font-semibold text-base ${tieneDefectosInput ? "text-destructive" : "text-foreground"}`}>
                                            Tiene defectos
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-medium">
                                        {tieneDefectosInput ? "Sí" : "No"}
                                    </span>
                                </button>
                                {tieneDefectosInput && (
                                    <div className="mt-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-medium">Defectos de la caja</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddDefectoItem}
                                                disabled={isRegisteringScan || isCatalogoDefectosLoading}
                                            >
                                                + Agregar otro defecto
                                            </Button>
                                        </div>
                                        {isCatalogoDefectosLoading && (
                                            <p className="text-sm text-muted-foreground">Cargando catálogo de defectos...</p>
                                        )}
                                        {catalogoDefectosError && (
                                            <p className="text-sm text-destructive">{catalogoDefectosError}</p>
                                        )}
                                        {!isCatalogoDefectosLoading && !catalogoDefectosError && catalogoDefectos.length > 0 && (
                                            <div className="space-y-3">
                                                {defectosCajaInput.map((item, index) => (
                                                    <div key={`defecto-item-${index}`} className="rounded-xl border border-border p-3 space-y-3 bg-muted/10">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div className="sm:col-span-2 space-y-1">
                                                                <Label className="text-sm">Defecto</Label>
                                                                <Popover
                                                                    open={openDefectoIndex === index}
                                                                    onOpenChange={(open) => setOpenDefectoIndex(open ? index : null)}
                                                                >
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            role="combobox"
                                                                            aria-expanded={openDefectoIndex === index}
                                                                            className="h-11 w-full justify-between font-normal"
                                                                            disabled={isRegisteringScan}
                                                                        >
                                                                            <span className="truncate">
                                                                                {item.defectoId
                                                                                    ? (() => {
                                                                                        const defectoSeleccionado = catalogoDefectos.find(
                                                                                            (defecto) => defecto.id === item.defectoId,
                                                                                        );
                                                                                        return defectoSeleccionado
                                                                                            ? `${defectoSeleccionado.detalle} · ${defectoSeleccionado.familia}`
                                                                                            : "Seleccione un defecto";
                                                                                    })()
                                                                                    : "Buscar y seleccionar defecto"}
                                                                            </span>
                                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                                        <Command className="**:data-[slot=command-input-wrapper]:h-11 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:py-3">
                                                                            <CommandInput placeholder="Buscar por familia o defecto..." />
                                                                            <CommandList className="max-h-72">
                                                                                <CommandEmpty>No se encontraron defectos.</CommandEmpty>
                                                                                {Object.entries(defectosPorFamilia).map(([familia, defectos]) => (
                                                                                    <CommandGroup key={familia} heading={familia}>
                                                                                        {defectos.map((defecto) => (
                                                                                            <CommandItem
                                                                                                key={defecto.id}
                                                                                                value={`${defecto.detalle} ${defecto.familia}`}
                                                                                                onSelect={() => {
                                                                                                    updateDefectoItem(index, { defectoId: defecto.id });
                                                                                                    setOpenDefectoIndex(null);
                                                                                                }}
                                                                                            >
                                                                                                <Check
                                                                                                    className={`mr-2 h-4 w-4 ${
                                                                                                        item.defectoId === defecto.id ? "opacity-100" : "opacity-0"
                                                                                                    }`}
                                                                                                />
                                                                                                <span className="flex-1">{defecto.detalle}</span>
                                                                                                <span className="text-xs text-muted-foreground">{defecto.familia}</span>
                                                                                            </CommandItem>
                                                                                        ))}
                                                                                    </CommandGroup>
                                                                                ))}
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-sm">Cantidad afectada</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.cantidad}
                                                                    onChange={(e) => updateDefectoItem(index, { cantidad: e.target.value })}
                                                                    placeholder="Ej. 3"
                                                                    disabled={isRegisteringScan}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end gap-2">
                                                            <div className="flex-1 space-y-1">
                                                                <Label className="text-sm">Comentario (opcional)</Label>
                                                                <Input
                                                                    value={item.comentario}
                                                                    onChange={(e) => updateDefectoItem(index, { comentario: e.target.value })}
                                                                    placeholder="Detalle adicional"
                                                                    disabled={isRegisteringScan}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveDefectoItem(index)}
                                                                disabled={isRegisteringScan || defectosCajaInput.length === 1}
                                                                title="Quitar defecto"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {registerError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {registerError}
                                </div>
                            )}
                            {registerSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                                    <CheckSquare className="w-4 h-4 shrink-0" />
                                    {registerSuccess}
                                </div>
                            )}
                            {registerStatusMessage && (
                                <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg">
                                    {registerStatusMessage}
                                </div>
                            )}

                            <Button type="submit" className="w-full h-16 text-xl font-semibold" disabled={isRegisteringScan}>
                                {isRegisteringScan ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Registrando...</>
                                ) : (
                                    "Agregar Caja"
                                )}
                            </Button>

                            <div className="pt-1 border-t border-border">
                                {selectedTarima.cajasLlevamos === 0 && (
                                    <p className="pt-3 mb-2 text-sm text-muted-foreground text-center">
                                        Registre al menos una caja para terminar la tarima.
                                    </p>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-14 text-base font-semibold border-2 mt-3"
                                    onClick={() => {
                                        setCloseTarimaError(null);
                                        setCloseTarimaSuccess(null);
                                        setCloseTarimaEstatusCierre("");
                                        setCloseTarimaAgregarComentario(false);
                                        setCloseTarimaComentario("");
                                        setIsCloseTarimaModalOpen(true);
                                    }}
                                    disabled={
                                        dashboardData.estado !== "EN PROCESO" ||
                                        !selectedTarima ||
                                        selectedTarima.cajasLlevamos === 0
                                    }
                                >
                                    <Truck className="w-5 h-5 mr-2" />
                                    Terminar Tarima #{selectedTarima.numeroTarima}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Tarimas Terminadas */}
            <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-primary" />
                            Tarimas Terminadas
                        </CardTitle>
                        {tarimasTerminadas.length > 0 && (
                            <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                                {tarimasTerminadas.length} tarima{tarimasTerminadas.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isTarimasTerminadasLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando...
                        </div>
                    )}
                    {tarimasTerminadasError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {tarimasTerminadasError}
                        </div>
                    )}
                    {reopenTarimaError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {reopenTarimaError}
                        </div>
                    )}
                    {reopenTarimaSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                            <Check className="w-4 h-4" />
                            {reopenTarimaSuccess}
                        </div>
                    )}
                    {!isAdminUser && tarimasTerminadas.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            Solo los administradores pueden reabrir tarimas.
                        </div>
                    )}
                    {!isTarimasTerminadasLoading && !tarimasTerminadasError && tarimasTerminadas.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">Sin tarimas terminadas todavía.</p>
                    )}
                    {tarimasTerminadas.length > 0 && (
                        <Accordion type="single" collapsible className="space-y-2">
                            {tarimasTerminadas.map((tarima) => {
                                const defectCount = tarima.cajas.filter((c) => c.tieneDefectos).length;
                                const hasErrores = defectCount > 0;
                                const estatusCierre = getCloseTarimaStatusLabel(tarima.estatusCierre);
                                const estatusCierreClass =
                                    estatusCierre.toLowerCase() === "sin hallazgos"
                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                        : estatusCierre.toLowerCase() === "rechazada"
                                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                                            : "bg-amber-100 text-amber-700 border border-amber-200";
                                return (
                                    <AccordionItem
                                        key={tarima.tarimaId}
                                        value={String(tarima.tarimaId)}
                                        className="rounded-xl border border-border bg-muted/20 overflow-hidden px-0"
                                    >
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                                            <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-base">Tarima #{tarima.numeroTarima}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {tarima.cajasRegistradas} cajas · {tarima.usuario}
                                                    </p>
                                                    {tarima.cajas.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {tarima.cajas.map((caja) => (
                                                                <span
                                                                    key={caja.detalleId}
                                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-none ${
                                                                        caja.tieneDefectos
                                                                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                                                                            : "bg-muted text-muted-foreground"
                                                                    }`}
                                                                >
                                                                    {caja.identificador}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 mr-2">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estatusCierreClass}`}>
                                                        {estatusCierre}
                                                    </span>
                                                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                                        {tarima.cajasRegistradas} cj
                                                    </span>
                                                    <span
                                                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                            hasErrores
                                                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                        }`}
                                                    >
                                                        {hasErrores
                                                            ? `${defectCount} con error${defectCount !== 1 ? "es" : ""}`
                                                            : "Sin errores"}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-0 pb-0">
                                            <div className="px-4 pb-2 border-t border-border pt-2 flex items-center justify-between gap-3">
                                                <span className="text-xs text-muted-foreground">
                                                    Cerrada: {new Date(tarima.fechaCierre).toLocaleString()}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => handleReopenTarima(tarima)}
                                                    disabled={reopeningTarimaId === tarima.tarimaId}
                                                    title={
                                                        isAdminUser
                                                            ? "Reabrir tarima"
                                                            : "Solo los administradores pueden reabrir tarimas"
                                                    }
                                                >
                                                    {reopeningTarimaId === tarima.tarimaId ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                            Reabriendo...
                                                        </>
                                                    ) : (
                                                        "Reabrir tarima"
                                                    )}
                                                </Button>
                                            </div>
                                            {tarima.comentarioCierre && (
                                                <div className="px-4 pb-2 text-xs text-muted-foreground">
                                                    Comentario cierre: {tarima.comentarioCierre}
                                                </div>
                                            )}
                                            <div className="divide-y divide-border">
                                                {tarima.cajas.map((caja) => {
                                                    const defectosCaja = Array.isArray(caja.defectos) ? caja.defectos : [];
                                                    return (
                                                        <div key={caja.detalleId} className="flex items-start justify-between gap-3 px-4 py-3">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm">{caja.identificador}</p>
                                                                <p className="text-xs text-muted-foreground">{caja.cantidad} pz · {caja.piezasAuditadas} auditadas</p>
                                                                {caja.tieneDefectos && defectosCaja.length > 0 && (
                                                                    <details className="mt-2 text-xs">
                                                                        <summary className="cursor-pointer text-destructive font-medium">
                                                                            Ver detalle de errores ({defectosCaja.length})
                                                                        </summary>
                                                                        <div className="mt-1 space-y-1 text-muted-foreground">
                                                                            {defectosCaja.map((defecto, index) => (
                                                                                <p key={`${caja.detalleId}-defecto-${index}`}>
                                                                                    {defecto.detalle || defecto.nombre || "Defecto"}
                                                                                    {typeof defecto.cantidad === "number" ? ` · ${defecto.cantidad}` : ""}
                                                                                    {defecto.comentario ? ` · ${defecto.comentario}` : ""}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    </details>
                                                                )}
                                                                {caja.tieneDefectos && defectosCaja.length === 0 && caja.comentarios && (
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        Error: {caja.comentarios}
                                                                    </p>
                                                                )}
                                                                {renderEvidenceGallery(caja.detalleId, caja.fotos, { compact: true })}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {caja.tieneDefectos && (
                                                                    <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                                                                        Con defecto
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        Resumen de defectos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isDefectosResumenLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando resumen de defectos...
                        </div>
                    )}
                    {defectosResumenError && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            {defectosResumenError}
                        </div>
                    )}
                    {!isDefectosResumenLoading && !defectosResumenError && defectosResumen.length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin defectos registrados todavía.</p>
                    )}
                    {defectosResumen.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="py-2 pr-3 font-medium">Familia</th>
                                        <th className="py-2 pr-3 font-medium">Detalle</th>
                                        <th className="py-2 pr-3 font-medium">Veces</th>
                                        <th className="py-2 font-medium">Piezas afectadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {defectosResumen.map((item, idx) => (
                                        <tr key={`res-def-${idx}-${item.detalle}`} className="border-b last:border-b-0">
                                            <td className="py-2 pr-3">{item.familia}</td>
                                            <td className="py-2 pr-3">{item.detalle}</td>
                                            <td className="py-2 pr-3 font-medium">{item.vecesPresentado}</td>
                                            <td className="py-2 font-medium">{item.piezasAfectadas}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isConsecutivoHelpOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold">Guia Consecutivo Manual</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsConsecutivoHelpOpen(false)}
                            >
                                &times;
                            </Button>
                        </div>
                        <div className="flex justify-center">
                            <img
                                src="/guia-consecDestiny.jpg"
                                alt="Guia para consecutivo manual Destiny"
                                className="max-h-[70vh] w-auto rounded-md border"
                            />
                        </div>
                    </div>
                </div>
            )}

            {isDestinyUpdateHelpOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold">Nueva actualización Destiny</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDestinyUpdateHelpOpen(false)}
                            >
                                &times;
                            </Button>
                        </div>
                        <div className="space-y-3 text-sm leading-6 text-slate-700">
                            <p>
                                Ya no es necesario ingresar el consecutivo manual para Destiny.
                            </p>
                            <p>
                                Identifica la máquina y el consecutivo, abre las etiquetas disponibles por máquina y selecciona la etiqueta para verificarla.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <img
                                src="/guia-maquina.png"
                                alt="Guia para identificar la maquina y el consecutivo Destiny"
                                className="max-h-[55vh] w-auto max-w-full rounded-md border"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setIsDestinyUpdateHelpOpen(false)}>
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isPzasCajaHelpOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold">Guia Piezas por Caja (Destiny)</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsPzasCajaHelpOpen(false)}
                            >
                                &times;
                            </Button>
                        </div>
                        <div className="flex justify-center">
                            <img
                                src="/guia-pzasCajaDestiny.jpg"
                                alt="Guia de piezas por caja Destiny"
                                className="max-h-[70vh] w-auto rounded-md border"
                            />
                        </div>
                    </div>
                </div>
            )}

            {isQtyUomScannerOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold">Escanear codigo de barras</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsQtyUomScannerOpen(false)}
                            >
                                &times;
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <video ref={qtyUomVideoRef} className="w-full rounded-lg border" />
                            <p className="text-sm text-muted-foreground">
                                Enfoque el codigo de barras para llenar el Qty UOM.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Nota: esta funcionalidad esta en proceso y puede no ser 100% certera.
                            </p>
                            {qtyUomScanError && (
                                <p className="text-sm text-destructive">{qtyUomScanError}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isEvidenceModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Camera className="w-5 h-5 text-primary" /> Fotos de la Caja
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setIsEvidenceModalOpen(false); setEvidenceTargetId(null); }}
                                disabled={isEvidenceUploading || deletingEvidenceId !== null}
                            >
                                &times;
                            </Button>
                        </div>

                        <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-blue-50/60 p-4">
                            <p className="text-sm text-muted-foreground">
                                Detalle #{evidenceTargetId ?? lastDetalleId}. En tarimas activas puede agregar o eliminar fotos asociadas a esta caja.
                            </p>
                        </div>

                        <form onSubmit={handleEvidenceSubmit} className="space-y-4">
                            {typeof (evidenceTargetId ?? lastDetalleId) === "number" && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-card-foreground">Galeria actual</p>
                                            <p className="text-xs text-muted-foreground">Fotos ya asociadas a esta caja.</p>
                                        </div>
                                        {isEvidenceListLoadingByDetalleId[evidenceTargetId ?? lastDetalleId ?? 0] && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Actualizando...
                                            </div>
                                        )}
                                    </div>
                                    {renderEvidenceGallery(
                                        evidenceTargetId ?? lastDetalleId ?? 0,
                                        getCajaFallbackFotos(evidenceTargetId ?? lastDetalleId ?? 0),
                                        { editable: true, showManageButton: false }
                                    )}
                                    {!getCajaEvidencias(
                                        evidenceTargetId ?? lastDetalleId ?? 0,
                                        getCajaFallbackFotos(evidenceTargetId ?? lastDetalleId ?? 0)
                                    ).length &&
                                        !isEvidenceListLoadingByDetalleId[evidenceTargetId ?? lastDetalleId ?? 0] && (
                                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground text-center">
                                            Esta caja todavia no tiene fotos.
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="evidencias" className="text-card-foreground">
                                    Agregar nuevas fotos
                                </Label>
                                <Input
                                    id="evidencias"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={handleEvidenceFileChange}
                                    disabled={isEvidenceUploading || deletingEvidenceId !== null}
                                />
                                {selectedEvidenceFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {selectedEvidenceFiles.length} archivo(s) seleccionado(s). Puede seguir agregando más fotos antes de subir.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                            {selectedEvidenceFiles.map((file, index) => (
                                                <div
                                                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={() => handleRemoveEvidenceFile(index)}
                                                        disabled={isEvidenceUploading || deletingEvidenceId !== null}
                                                        title="Quitar foto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {evidenceError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {evidenceError}
                                </div>
                            )}

                            {evidenceSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {evidenceSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 text-base"
                                    disabled={isEvidenceUploading || deletingEvidenceId !== null || !selectedEvidenceFiles.length}
                                >
                                    {isEvidenceUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        "Subir fotos"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-14 text-base"
                                    onClick={() => { setIsEvidenceModalOpen(false); setEvidenceTargetId(null); }}
                                    disabled={isEvidenceUploading || deletingEvidenceId !== null}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCloseTarimaModalOpen && selectedTarima && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" /> Terminar tarima #{selectedTarima.numeroTarima}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCloseTarimaModalOpen(false)}
                                disabled={isClosingTarima}
                            >
                                &times;
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            Seleccione el estatus de cierre y, si aplica, agregue un comentario.
                        </p>

                        <form onSubmit={handleCloseTarimaSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="estatusCierreTarima" className="text-card-foreground">
                                    Estatus de cierre
                                </Label>
                                <Select
                                    value={closeTarimaEstatusCierre}
                                    onValueChange={setCloseTarimaEstatusCierre}
                                    disabled={isClosingTarima}
                                >
                                    <SelectTrigger id="estatusCierreTarima" className="w-full h-12">
                                        <SelectValue placeholder="Seleccione el estatus de cierre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLOSE_TARIMA_STATUS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                                    <input
                                        type="checkbox"
                                        checked={closeTarimaAgregarComentario}
                                        onChange={(e) => {
                                            setCloseTarimaAgregarComentario(e.target.checked);
                                            if (!e.target.checked) {
                                                setCloseTarimaComentario("");
                                            }
                                        }}
                                        disabled={isClosingTarima}
                                    />
                                    Desea agregar comentario
                                </label>
                                {closeTarimaAgregarComentario && (
                                    <Input
                                        id="comentarioTarima"
                                        value={closeTarimaComentario}
                                        onChange={(e) => setCloseTarimaComentario(e.target.value)}
                                        placeholder="Comentario de cierre"
                                        disabled={isClosingTarima}
                                        maxLength={300}
                                    />
                                )}
                            </div>

                            {closeTarimaError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {closeTarimaError}
                                </div>
                            )}

                            {closeTarimaSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {closeTarimaSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 text-base"
                                    disabled={isClosingTarima}
                                >
                                    {isClosingTarima ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Cerrando...
                                        </>
                                    ) : (
                                        "Terminar tarima"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-14 text-base"
                                    onClick={() => setIsCloseTarimaModalOpen(false)}
                                    disabled={isClosingTarima}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="pt-2">
                <Button
                    variant="destructive"
                    className="w-full h-16 text-xl font-semibold"
                    onClick={() => {
                        setFinishError(null);
                        setFinishSuccess(null);
                        setIsFinishModalOpen(true);
                    }}
                    disabled={dashboardData.estado !== "EN PROCESO"}
                >
                    <CheckSquare className="w-6 h-6 mr-2" />
                    Finalizar Verificación
                </Button>
            </div>

            {/* Modal para finalizar verificación */}
            {deleteTarimaConfirmId !== null && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold">¿Eliminar tarima?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    La tarima no tiene cajas registradas. Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>
                        {deleteTarimaError && (
                            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {deleteTarimaError}
                            </div>
                        )}
                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="destructive"
                                className="flex-1 h-12"
                                disabled={isDeletingTarima}
                                onClick={() => handleDeleteTarima(deleteTarimaConfirmId)}
                            >
                                {isDeletingTarima
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
                                    : "Sí, eliminar"
                                }
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 h-12"
                                disabled={isDeletingTarima}
                                onClick={() => { setDeleteTarimaConfirmId(null); setDeleteTarimaError(null); }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isFinishModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-primary" /> Finalizar verificación
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFinishModalOpen(false)}
                                disabled={isFinishing}
                            >
                                &times;
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            Complete los datos para cerrar la verificación #{verifiedIdNumber}.
                        </p>

                        <form onSubmit={handleFinishSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="muestreo" className="text-card-foreground">
                                    Muestreo
                                </Label>
                                <Input
                                    id="muestreo"
                                    value={finishMuestreo}
                                    onChange={(e) => setFinishMuestreo(e.target.value)}
                                    placeholder="Detalle del muestreo realizado"
                                    disabled={isFinishing}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comentarios" className="text-card-foreground">
                                    Comentarios
                                </Label>
                                <Textarea
                                    id="comentarios"
                                    value={finishComentarios}
                                    onChange={(e) => setFinishComentarios(e.target.value)}
                                    placeholder="Notas finales sobre la verificación"
                                    disabled={isFinishing}
                                    required
                                />
                            </div>

                            {finishError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {finishError}
                                </div>
                            )}

                            {finishSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {finishSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 text-base"
                                    disabled={isFinishing}
                                >
                                    {isFinishing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Finalizando...
                                        </>
                                    ) : (
                                        "Finalizar verificación"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-14 text-base"
                                    onClick={() => setIsFinishModalOpen(false)}
                                    disabled={isFinishing}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isQrScannerOpen && (
                <QrScannerModal
                    onScan={(value) => {
                        setTrazabilidadInput(value);
                        setIsQrScannerOpen(false);
                    }}
                    onClose={() => setIsQrScannerOpen(false)}
                />
            )}

        </div>
    );
}

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Nota: El uso de 'use(params)' es correcto si esta página es un Server Component que debe leer una promesa.
    // Si tienes problemas, cambia 'params: Promise<{ id: string }>' por 'params: { id: string }' y elimina el use().
    const resolvedParams = use(params)
    return (
        <AuthProvider>
            <VerificationProvider>
                <DashboardLayout>
                    <VerificationDetail verificationId={resolvedParams.id} />
                </DashboardLayout>
            </VerificationProvider>
        </AuthProvider>
    )
}
