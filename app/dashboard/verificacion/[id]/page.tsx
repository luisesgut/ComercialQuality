// src/components/verification-detail.tsx
"use client"

import React, { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Asegúrate de importar tus interfaces y componentes de UI
import { DashboardData } from '@/app/types/verification-types'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, TrendingUp, Package, Hash, Truck, AlertCircle, Clock, Layers, CheckSquare, HelpCircle, Check, ChevronsUpDown, Camera } from 'lucide-react';

// URL Base de la API
const API_BASE_URL = "http://172.16.10.31/api";

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

interface TarimaTerminadaCaja {
    detalleId: number;
    identificador: string;
    cantidad: number;
    piezasAuditadas: number;
    tieneDefectos: boolean;
    comentarios: string | null;
    horaEscaneo: string;
}

interface TarimaTerminada {
    tarimaId: number;
    numeroTarima: number;
    cajasRegistradas: number;
    usuario: string;
    fechaCierre: string;
    cajas: TarimaTerminadaCaja[];
}

const DEFECTO_OPTIONS = [
    "Perforaciones en texto/ausentes",
    "Etiqueta ausente",
    "Cantidad de piezas incorrecta",
    "Bolsa fuera de wicket",
    "Bolsa pegada del sello lateral",
    "Pestaña fuera de dimensiones",
    "Sello contaminado",
    "Bolsa dañada",
    "Orificios de wicket movidos",
    "Inocuidad (manchas u objetos dentro de cajas)",
    "Rebaba en perforaciones",
    "SELLO DÉBIL",
    "Precorte duro o fuera de lugar",
    "Sin tapones o carton wicket",
    "Notas en cinta o caja",
    "Precorte de wicket faltante",
    "Restos de sello (huesillo)",
    "Caja dañada",
    "Fuelle desfasado",
    "Mal refilado",
    "Empalmes",
    "BLOQUEO",
    "ZIPPER DÉBIL",
    "Bolsas desacomodadas",
    "Zipper fuera de distancia",
    "Fuelle deforme",
    "Muestras equivocadas",
    "Wicket alrevés",
    "Etiqueta erronea",
    "Desprendimiento de tinta",
    "Sin tratado",
];

export function VerificationDetail({ verificationId }: VerificationDetailProps) {
    const router = useRouter();
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
    const [isCreatingTarima, setIsCreatingTarima] = useState(false);
    const [createTarimaError, setCreateTarimaError] = useState<string | null>(null);
    const [createTarimaSuccess, setCreateTarimaSuccess] = useState<string | null>(null);
    const [trazabilidadInput, setTrazabilidadInput] = useState("");
    const [consecutivoManualInput, setConsecutivoManualInput] = useState("");
    const [qtyUomEtiquetaInput, setQtyUomEtiquetaInput] = useState("");
    const [piezasAuditadasInput, setPiezasAuditadasInput] = useState("");
    const [tieneDefectosInput, setTieneDefectosInput] = useState(false);
    const [comentariosDefectoInput, setComentariosDefectoInput] = useState("");
    const [isRegisteringScan, setIsRegisteringScan] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    const [registerStatusMessage, setRegisterStatusMessage] = useState<string | null>(null);
    const [lastDetalleId, setLastDetalleId] = useState<number | null>(null);
    const [isDefectoOpen, setIsDefectoOpen] = useState(false);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
    const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
    const [isCloseTarimaModalOpen, setIsCloseTarimaModalOpen] = useState(false);
    const [closeTarimaMotivo, setCloseTarimaMotivo] = useState("");
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
    const [isPzasCajaHelpOpen, setIsPzasCajaHelpOpen] = useState(false);
    const [qtyUomScanError, setQtyUomScanError] = useState<string | null>(null);
    const [isQtyUomScannerOpen, setIsQtyUomScannerOpen] = useState(false);
    
    // Función para obtener los detalles del dashboard (GET a /dashboard/{id})
    const fetchDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/dashboard/${verificationId}`);
            
            if (!response.ok) {
                // Si la verificación no existe o hay un error 4xx/5xx
                throw new Error(`Error (${response.status}) al obtener detalles del dashboard.`);
            }
            const data: DashboardData = await response.json();
            setDashboardData(data);
        } catch (err: any) {
            setError(err.message || "Error de conexión al cargar el dashboard.");
            setDashboardData(null); // Limpiar datos si hay error
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTarimasActivas = async () => {
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
    };

    const fetchTarimasTerminadas = async () => {
        setIsTarimasTerminadasLoading(true);
        setTarimasTerminadasError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/tarimas-terminadas/${verificationId}`);
            if (!response.ok) {
                throw new Error(`Error (${response.status}) al obtener tarimas terminadas.`);
            }
            const data: TarimaTerminada[] = await response.json();
            setTarimasTerminadas(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setTarimasTerminadasError(err.message || "Error de conexión al cargar tarimas terminadas.");
            setTarimasTerminadas([]);
        } finally {
            setIsTarimasTerminadasLoading(false);
        }
    };

    // Ejecutar el fetch al montar el componente y cuando el ID cambie
    useEffect(() => {
        if (verificationId) {
            fetchDashboardData();
            fetchTarimasActivas();
            fetchTarimasTerminadas();
        }
    }, [verificationId]);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("auth_user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed?.name) {
                    setCurrentUserName(parsed.name);
                }
            }
        } catch {
            // ignore parse errors
        }
    }, []);

    useEffect(() => {
        setRegisterError(null);
        setRegisterSuccess(null);
        setRegisterStatusMessage(null);
        setCloseTarimaError(null);
        setCloseTarimaSuccess(null);
    }, [selectedTarima]);

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
        const productInfoUpper = dashboardData.productoInfo.toUpperCase();
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
                        <Button onClick={fetchDashboardData}>Reintentar Carga</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!dashboardData) return null; // Debería ser atrapado por error o loading

    const verifiedIdNumber = dashboardData.verificacionId;
    const currentVerificationType = getVerificationType();

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
            setCreateTarimaSuccess("Tarima creada correctamente.");
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
            setTimeout(() => router.refresh(), 300);
        } catch (err: any) {
            setCreateTarimaError(err.message || "Error de conexión al crear tarima.");
        } finally {
            setIsCreatingTarima(false);
        }
    };

    const handleRegisterScan = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedTarima) return;

        setRegisterError(null);
        setRegisterSuccess(null);
        setRegisterStatusMessage(null);

        const isBioflex = currentVerificationType === "BIOFLEX";

        if (isBioflex && !trazabilidadInput) {
            setRegisterError("Ingrese la trazabilidad para registrar la caja.");
            return;
        }

        if (!isBioflex && !consecutivoManualInput) {
            setRegisterError("Ingrese el consecutivo manual para registrar la caja.");
            return;
        }

        if (!qtyUomEtiquetaInput) {
            setRegisterError("Ingrese las piezas por caja (Qty UOM).");
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

        if (tieneDefectosInput && !comentariosDefectoInput) {
            setRegisterError("Agregue comentarios del defecto.");
            return;
        }

        const tipoEtiqueta = currentVerificationType;

        const payload: Record<string, any> = {
            verificacionId: verifiedIdNumber,
            tarimaId: selectedTarima.tarimaId,
            trazabilidad: isBioflex ? trazabilidadInput : null,
            consecutivoManual: isBioflex ? 0 : Number(consecutivoManualInput),
            qtyUomEtiqueta: qtyUomEtiquetaInput,
            tipoEtiqueta,
            piezasAuditadas: piezasAuditadasValue,
            ...(tieneDefectosInput
                ? { tieneDefectos: true, comentariosDefecto: comentariosDefectoInput }
                : {}),
        };

        setIsRegisteringScan(true);

        try {
            const response = await fetch(`${API_BASE_URL}/Verificacion/registrar-escaneo`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let detail = `Error (${response.status}) al registrar caja.`;
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

            const data = await response.json();
            setRegisterSuccess("Caja registrada correctamente.");
            if (data?.mensajeEstado) {
                setRegisterStatusMessage(data.mensajeEstado);
            }
            if (data?.ultimoDetalleId) {
                setLastDetalleId(Number(data.ultimoDetalleId));
            } else {
                setLastDetalleId(null);
            }
            setTrazabilidadInput("");
            setConsecutivoManualInput("");
            setQtyUomEtiquetaInput("");
            setPiezasAuditadasInput("");
            setTieneDefectosInput(false);
            setComentariosDefectoInput("");
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
            setTimeout(() => router.refresh(), 300);

            if (tieneDefectosInput && data?.ultimoDetalleId) {
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
        setSelectedEvidenceFiles(files);
    };

    const handleEvidenceSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setEvidenceError(null);
        setEvidenceSuccess(null);

        if (!selectedEvidenceFiles.length) {
            setEvidenceError("Seleccione al menos una foto.");
            return;
        }

        if (!lastDetalleId) {
            setEvidenceError("No se encontro el detalle para asociar la evidencia.");
            return;
        }

        setIsEvidenceUploading(true);

        try {
            const formData = new FormData();
            formData.append("VerificacionId", String(verifiedIdNumber));
            formData.append("DetalleId", String(lastDetalleId));
            selectedEvidenceFiles.forEach((file) => formData.append("Fotos", file));

            const response = await fetch(`${API_BASE_URL}/Verificacion/subir-evidencia`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                let detail = `Error (${response.status}) al subir evidencia.`;
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

            setEvidenceSuccess("Evidencia subida correctamente.");
            setSelectedEvidenceFiles([]);
            setTimeout(() => setIsEvidenceModalOpen(false), 600);
        } catch (err: any) {
            setEvidenceError(err.message || "Error de conexión al subir la evidencia.");
        } finally {
            setIsEvidenceUploading(false);
        }
    };

    const handleCloseTarimaSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedTarima) return;

        setCloseTarimaError(null);
        setCloseTarimaSuccess(null);

        if (!closeTarimaMotivo.trim()) {
            setCloseTarimaError("Ingrese el motivo de cierre.");
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
                    motivo: closeTarimaMotivo.trim(),
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
            setCloseTarimaMotivo("");
            setTimeout(() => setIsCloseTarimaModalOpen(false), 600);
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
            setTimeout(() => router.refresh(), 300);
            setSelectedTarima(null);
        } catch (err: any) {
            setCloseTarimaError(err.message || "Error de conexión al cerrar tarima.");
        } finally {
            setIsClosingTarima(false);
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
        <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header y Navegación */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/pendientes")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Verificación #{dashboardData.verificacionId}</h1>
                    <p className="text-muted-foreground">Estado: **{dashboardData.estado}**</p>
                </div>
            </div>

            {/* Información Principal del Lote */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className='flex items-center gap-3'>
                         <Hash className="w-6 h-6 text-primary" />
                         <CardTitle className="text-xl">Lote/Orden: {dashboardData.loteOrden}</CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-9">
                        <p className="text-sm text-muted-foreground">Producto Info: {dashboardData.productoInfo}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-sm font-semibold text-foreground">{dashboardData.cliente}</span>
                    </div>
                </CardHeader>
            </Card>

            {/* Tarjetas de Avance (KPIs) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <CardHeader className="pb-2">
                        <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />
                        <p className="text-xs text-muted-foreground">Avance</p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">{dashboardData.porcentajeAvance}%</p>
                    </CardContent>
                </Card>
                
                <Card className="text-center">
                    <CardHeader className="pb-2">
                        <Package className="w-5 h-5 text-blue-500 mx-auto" />
                        <p className="text-xs text-muted-foreground">Cajas Registradas</p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{dashboardData.cajasActuales}</p>
                        <p className="text-xs text-muted-foreground">({dashboardData.piezasActuales} pz)</p>
                    </CardContent>
                </Card>

                <Card className="text-center">
                    <CardHeader className="pb-2">
                        <Truck className="w-5 h-5 text-orange-500 mx-auto" />
                        <p className="text-xs text-muted-foreground">Tarimas Actuales</p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{dashboardData.tarimasActuales}</p>
                        <p className="text-xs text-muted-foreground">({dashboardData.tarimasTotalesEstimadas} estimadas)</p>
                    </CardContent>
                </Card>
                
                <Card className="text-center">
                    <CardHeader className="pb-2">
                        <Clock className="w-5 h-5 text-gray-500 mx-auto" />
                        <p className="text-xs text-muted-foreground">Tiempo (min)</p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{dashboardData.tiempoTranscurridoMinutos}</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Crear Tarima */}
            <Card className="border-0 shadow-lg bg-card">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Crear Tarima
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Cree una tarima activa para poder registrar cajas individuales.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {createTarimaError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {createTarimaError}
                        </div>
                    )}
                    {createTarimaSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {createTarimaSuccess}
                        </div>
                    )}
                    <Button
                        className="w-full h-12 text-lg"
                        onClick={handleCreateTarima}
                        disabled={isCreatingTarima || dashboardData.estado !== "EN PROCESO"}
                    >
                        {isCreatingTarima ? "Creando..." : "Crear Tarima"}
                    </Button>
                </CardContent>
            </Card>

            {/* Tarimas Activas */}
            <Card className="border-0 shadow-lg bg-card">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Tarimas Activas
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Seleccione una tarima para registrar cajas individuales. Si hay varias personas trabajando, use el boton de refrescar para ver cambios al instante.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
                            Actualizacion compartida entre dispositivos
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                fetchTarimasActivas();
                                fetchTarimasTerminadas();
                            }}
                            disabled={isTarimasLoading}
                        >
                            {isTarimasLoading ? "Actualizando..." : "Refrescar"}
                        </Button>
                    </div>
                    {isTarimasLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando tarimas activas...
                        </div>
                    )}
                    {tarimasError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {tarimasError}
                        </div>
                    )}
                    {!isTarimasLoading && !tarimasError && tarimasActivas.length === 0 && (
                        <div className="text-sm text-muted-foreground bg-muted/40 p-4 rounded-lg">
                            No hay tarimas activas todavia. Cree una para comenzar.
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tarimasActivas.map((tarima) => {
                            const isSelected = selectedTarima?.tarimaId === tarima.tarimaId;
                            const progress = tarima.meta > 0
                                ? Math.min(100, (tarima.cajasLlevamos / tarima.meta) * 100)
                                : 0;
                            return (
                                <button
                                    type="button"
                                    key={tarima.tarimaId}
                                    onClick={() => setSelectedTarima(tarima)}
                                    className={`rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 ${isSelected ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20" : "border-border bg-muted/30"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Tarima</p>
                                            <p className="text-lg font-semibold">#{tarima.numeroTarima}</p>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                            {isSelected ? "Seleccionada" : "Seleccionar"}
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{tarima.cajasLlevamos} / {tarima.meta} cajas</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-primary transition"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-muted-foreground">Creada por: {tarima.usuarioCreo}</p>
                                </button>
                            );
                        })}
                    </div>
                    {selectedTarima && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Tarima seleccionada</p>
                                <p className="text-lg font-semibold">#{selectedTarima.numeroTarima}</p>
                                <p className="text-xs text-muted-foreground">Cajas: {selectedTarima.cajasLlevamos} / {selectedTarima.meta}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Continúe con el registro de cajas abajo.
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tarimas Terminadas */}
            <Card className="border-0 shadow-lg bg-card">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-primary" />
                        Tarimas Terminadas
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Resumen de tarimas cerradas y sus cajas registradas.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isTarimasTerminadasLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando tarimas terminadas...
                        </div>
                    )}
                    {tarimasTerminadasError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {tarimasTerminadasError}
                        </div>
                    )}
                    {!isTarimasTerminadasLoading && !tarimasTerminadasError && tarimasTerminadas.length === 0 && (
                        <div className="text-sm text-muted-foreground bg-muted/40 p-4 rounded-lg">
                            No hay tarimas terminadas todavia.
                        </div>
                    )}
                    {tarimasTerminadas.map((tarima) => (
                        <div key={tarima.tarimaId} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">Tarima cerrada</p>
                                    <p className="text-lg font-semibold">#{tarima.numeroTarima}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Cajas registradas: <span className="font-semibold text-foreground">{tarima.cajasRegistradas}</span>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Cerrada por: {tarima.usuario} · {new Date(tarima.fechaCierre).toLocaleString()}
                            </div>
                            <div className="space-y-2">
                                {tarima.cajas.map((caja) => (
                                    <div key={caja.detalleId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                                        <div>
                                            <p className="text-sm font-medium">{caja.identificador}</p>
                                            <p className="text-xs text-muted-foreground">Cantidad: {caja.cantidad} · Auditadas: {caja.piezasAuditadas}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {caja.tieneDefectos ? "Con defectos" : "Sin defectos"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {selectedTarima && (
                <Card className="border-0 shadow-lg bg-card">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-xl">Agregar Caja Individual</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Tarima seleccionada: #{selectedTarima.numeroTarima}
                                </p>
                            </div>
                                <div className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                                    Paso 2
                                </div>
                            </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegisterScan} className="space-y-5">
                            {currentVerificationType === "BIOFLEX" ? (
                                <div className="space-y-2">
                                    <Label htmlFor="trazabilidad">Trazabilidad</Label>
                                    <Input
                                        id="trazabilidad"
                                        value={trazabilidadInput}
                                        onChange={(e) => setTrazabilidadInput(e.target.value)}
                                        placeholder="Escanee o ingrese la trazabilidad"
                                        disabled={isRegisteringScan}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="consecutivo">Consecutivo Manual</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5"
                                            onClick={() => setIsConsecutivoHelpOpen(true)}
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Input
                                        id="consecutivo"
                                        type="number"
                                        value={consecutivoManualInput}
                                        onChange={(e) => setConsecutivoManualInput(e.target.value)}
                                        placeholder="Ingrese el consecutivo manual"
                                        disabled={isRegisteringScan}
                                        min="1"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="qtyUomEtiqueta">Piezas por Caja (Qty UOM)</Label>
                                        {currentVerificationType === "DESTINY" && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
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
                                            value={qtyUomEtiquetaInput}
                                            onChange={(e) => {
                                                setQtyUomEtiquetaInput(e.target.value);
                                                setQtyUomScanError(null);
                                            }}
                                            placeholder="Ej. 1000"
                                            disabled={isRegisteringScan}
                                            min="1"
                                        />
                                        {currentVerificationType === "DESTINY" && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12"
                                                    onClick={handleQtyUomCaptureClick}
                                                    disabled={isRegisteringScan}
                                                    aria-label="Escanear codigo de barras"
                                                >
                                                    <Camera className="h-5 w-5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    {qtyUomScanError && (
                                        <p className="text-xs text-destructive">{qtyUomScanError}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="piezasAuditadas">Piezas Auditadas</Label>
                                    <Input
                                        id="piezasAuditadas"
                                        type="number"
                                        value={piezasAuditadasInput}
                                        onChange={(e) => setPiezasAuditadasInput(e.target.value)}
                                        placeholder="Ingrese piezas revisadas"
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
                                            Maximo permitido: {Number(qtyUomEtiquetaInput)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="tieneDefectos"
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={tieneDefectosInput}
                                        onChange={(e) => setTieneDefectosInput(e.target.checked)}
                                        disabled={isRegisteringScan}
                                    />
                                    <Label htmlFor="tieneDefectos">Tiene defectos</Label>
                                </div>

                                {tieneDefectosInput && (
                                    <div className="space-y-2">
                                        <Label htmlFor="comentariosDefecto">Defecto</Label>
                                        <Popover open={isDefectoOpen} onOpenChange={setIsDefectoOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="comentariosDefecto"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isDefectoOpen}
                                                    className="h-14 w-full justify-between text-base"
                                                    disabled={isRegisteringScan}
                                                >
                                                    <span className="truncate">
                                                        {comentariosDefectoInput || "Seleccione el defecto encontrado"}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-base">
                                                    <CommandInput placeholder="Buscar defecto..." />
                                                    <CommandList className="max-h-72">
                                                        <CommandEmpty>No se encontraron defectos.</CommandEmpty>
                                                        <CommandGroup>
                                                            {DEFECTO_OPTIONS.map((defecto) => (
                                                                <CommandItem
                                                                    key={defecto}
                                                                    value={defecto}
                                                                    onSelect={(value) => {
                                                                        setComentariosDefectoInput(value);
                                                                        setIsDefectoOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={`mr-2 h-5 w-5 ${comentariosDefectoInput === defecto ? "opacity-100" : "opacity-0"}`}
                                                                    />
                                                                    {defecto}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>

                            {registerError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {registerError}
                                </div>
                            )}

                            {registerSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {registerSuccess}
                                </div>
                            )}
                            {registerStatusMessage && (
                                <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg">
                                    {registerStatusMessage}
                                </div>
                            )}

                            <Button type="submit" className="w-full h-12 text-lg" disabled={isRegisteringScan}>
                                {isRegisteringScan ? "Registrando..." : "Agregar caja individual"}
                            </Button>
                        </form>
                        <div className="pt-4">
                            {selectedTarima && selectedTarima.cajasLlevamos === 0 && (
                                <p className="mb-2 text-sm text-muted-foreground">
                                    Debe escanear al menos una caja para terminar la tarima.
                                </p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 text-lg"
                                onClick={() => {
                                    setCloseTarimaError(null);
                                    setCloseTarimaSuccess(null);
                                    setIsCloseTarimaModalOpen(true);
                                }}
                                disabled={
                                    dashboardData.estado !== "EN PROCESO" ||
                                    !selectedTarima ||
                                    selectedTarima.cajasLlevamos === 0
                                }
                            >
                                Terminar tarima
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-destructive" /> Evidencia de defectos
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEvidenceModalOpen(false)}
                                disabled={isEvidenceUploading}
                            >
                                &times;
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            Suba fotos para el detalle #{lastDetalleId}.
                        </p>

                        <form onSubmit={handleEvidenceSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="evidencias" className="text-card-foreground">
                                    Fotos (formatos de imagen)
                                </Label>
                                <Input
                                    id="evidencias"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={handleEvidenceFileChange}
                                    disabled={isEvidenceUploading}
                                />
                                {selectedEvidenceFiles.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {selectedEvidenceFiles.length} archivo(s) seleccionado(s)
                                    </p>
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
                                    <AlertCircle className="w-4 h-4" />
                                    {evidenceSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={isEvidenceUploading || !selectedEvidenceFiles.length}
                                >
                                    {isEvidenceUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        "Subir evidencia"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsEvidenceModalOpen(false)}
                                    disabled={isEvidenceUploading}
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
                            Indique el motivo por el cual se cierra la tarima.
                        </p>

                        <form onSubmit={handleCloseTarimaSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="motivoTarima" className="text-card-foreground">
                                    Motivo
                                </Label>
                                <Textarea
                                    id="motivoTarima"
                                    value={closeTarimaMotivo}
                                    onChange={(e) => setCloseTarimaMotivo(e.target.value)}
                                    placeholder="Ej. Tarima completa, cambio de orden, etc."
                                    disabled={isClosingTarima}
                                    required
                                />
                            </div>

                            {closeTarimaError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {closeTarimaError}
                                </div>
                            )}

                            {closeTarimaSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {closeTarimaSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1"
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
                                    className="flex-1"
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

            <Button
                variant="destructive"
                className="w-full h-12 text-lg"
                onClick={() => {
                    setFinishError(null);
                    setFinishSuccess(null);
                    setIsFinishModalOpen(true);
                }}
                disabled={dashboardData.estado !== "EN PROCESO"}
            >
                <CheckSquare className="w-5 h-5 mr-2" />
                Finalizar revisión
            </Button>

            {/* Modal para finalizar verificación */}
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
                                    <AlertCircle className="w-4 h-4" />
                                    {finishSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    className="flex-1"
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
                                    className="flex-1"
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
    
        </div>
    );
}

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Nota: El uso de 'use(params)' es correcto si esta página es un Server Component que debe leer una promesa.
    // Si tienes problemas, cambia 'params: Promise<{ id: string }>' por 'params: { id: string }' y elimina el use().
    const resolvedParams = use(params)
    return <VerificationDetail verificationId={resolvedParams.id} />
}
