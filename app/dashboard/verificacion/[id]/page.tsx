// src/components/verification-detail.tsx
"use client"

import React, { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Asegúrate de importar tus interfaces y componentes de UI
import { DashboardData } from '@/app/types/verification-types'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, TrendingUp, Package, Hash, Truck, AlertCircle, Clock, Layers, CheckSquare, HelpCircle, Check, ChevronsUpDown, Camera, QrCode, Printer, Trash2, ExternalLink } from 'lucide-react';
import { TarimaLabelModal } from "@/components/TarimaLabelModal";
import { TarimaQRModal } from "@/components/TarimaQRModal";
import type { TarimaDetalle } from "@/hooks/useTarimaDetail";

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
    const [deleteTarimaConfirmId, setDeleteTarimaConfirmId] = useState<number | null>(null);
    const [isDeletingTarima, setIsDeletingTarima] = useState(false);
    const [deleteTarimaError, setDeleteTarimaError] = useState<string | null>(null);
    const [trazabilidadInput, setTrazabilidadInput] = useState("");
    const [consecutivoManualInput, setConsecutivoManualInput] = useState("");
    const [qtyUomEtiquetaInput, setQtyUomEtiquetaInput] = useState("");
    const [piezasAuditadasInput, setPiezasAuditadasInput] = useState("");
    const [tieneDefectosInput, setTieneDefectosInput] = useState(false);
    const [comentariosDefectoInput, setComentariosDefectoInput] = useState<string[]>([]);
    const [isRegisteringScan, setIsRegisteringScan] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    const [registerStatusMessage, setRegisterStatusMessage] = useState<string | null>(null);
    const [lastDetalleId, setLastDetalleId] = useState<number | null>(null);
    const [isDefectoOpen, setIsDefectoOpen] = useState(false);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [evidenceTargetId, setEvidenceTargetId] = useState<number | null>(null);
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
    const [tarimaLabelData, setTarimaLabelData] = useState<TarimaDetalle | null>(null);
    const [isTarimaLabelOpen, setIsTarimaLabelOpen] = useState(false);
    const [isTarimaQROpen, setIsTarimaQROpen] = useState(false);
    const [reprintLoadingId, setReprintLoadingId] = useState<number | null>(null);
    
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

    const handleOpenPrintCard = () => {
        if (!dashboardData?.printCard) return;
        const printCardUrl = `${API_BASE_URL}/Printcard/${encodeURIComponent(dashboardData.printCard)}`;
        const win = window.open(printCardUrl, "_blank", "noopener,noreferrer");
        if (!win) {
            alert("No se pudo abrir el PrintCard. Verifique que el navegador permita ventanas emergentes.");
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

    // Sincronizar selectedTarima con los datos frescos de tarimasActivas.
    // Sin esto, selectedTarima.cajasLlevamos queda como snapshot stale
    // y el botón "Terminar tarima" permanece deshabilitado tras agregar la primera caja.
    useEffect(() => {
        if (!selectedTarima) return;
        const updated = tarimasActivas.find((t) => t.tarimaId === selectedTarima.tarimaId);
        if (updated && updated.cajasLlevamos !== selectedTarima.cajasLlevamos) {
            setSelectedTarima(updated);
        }
    }, [tarimasActivas]);

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

            // Leer el body antes de cualquier otra llamada async
            const createData = await response.json().catch(() => null);

            setCreateTarimaSuccess("Tarima creada correctamente.");
            fetchTarimasActivas();
            fetchTarimasTerminadas();
            fetchDashboardData();
            setTimeout(() => router.refresh(), 300);

            // Obtener detalle completo para mostrar etiqueta
            const newTarimaId = createData?.tarimaId;
            if (newTarimaId) {
                try {
                    const labelRes = await fetch(`${API_BASE_URL}/Verificacion/tarima/${newTarimaId}`);
                    if (labelRes.ok) {
                        const labelData = await labelRes.json();
                        setTarimaLabelData(labelData);
                        setIsTarimaLabelOpen(true);
                    }
                } catch {
                    // Si falla el GET de la etiqueta no bloqueamos el flujo
                }
            }
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
            fetchDashboardData();
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
    };

    const handleReprintLabel = async (tarimaId: number) => {
        setReprintLoadingId(tarimaId);
        try {
            const res = await fetch(`${API_BASE_URL}/Verificacion/tarima/${tarimaId}`);
            if (res.ok) {
                const data = await res.json();
                setTarimaLabelData(data);
                setIsTarimaLabelOpen(true);
            }
        } catch {
            // ignore
        } finally {
            setReprintLoadingId(null);
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

        if (tieneDefectosInput && comentariosDefectoInput.length === 0) {
            setRegisterError("Seleccione al menos un tipo de defecto.");
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
                ? { tieneDefectos: true, comentariosDefecto: comentariosDefectoInput.join(" | ") }
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
            setComentariosDefectoInput([]);
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

        const activeDetalleId = evidenceTargetId ?? lastDetalleId;
        if (!activeDetalleId) {
            setEvidenceError("No se encontro el detalle para asociar la evidencia.");
            return;
        }

        setIsEvidenceUploading(true);

        try {
            const formData = new FormData();
            formData.append("VerificacionId", String(verifiedIdNumber));
            formData.append("DetalleId", String(activeDetalleId));
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
            setTimeout(() => { setIsEvidenceModalOpen(false); setEvidenceTargetId(null); }, 600);
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
        <div className="max-w-4xl mx-auto space-y-6 pb-8">

            {/* Header */}
            <div className="space-y-2">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => router.push("/dashboard/pendientes")}>
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
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orden</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.loteOrden}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta piezas</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.piezasMeta.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tarimas est.</p>
                                <p className="text-sm font-bold mt-0.5">{dashboardData.tarimasTotalesEstimadas}</p>
                            </div>
                        </div>

                        {dashboardData.printCard && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 gap-2"
                                onClick={handleOpenPrintCard}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Ver PrintCard · {dashboardData.printCard}
                            </Button>
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
                                onClick={() => { fetchTarimasActivas(); fetchTarimasTerminadas(); }}
                                disabled={isTarimasLoading}
                                className="h-10 px-3 text-sm"
                            >
                                {isTarimasLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refrescar"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 px-3 text-sm"
                                onClick={() => setIsTarimaQROpen(true)}
                                title="Gestionar tarima por QR"
                            >
                                <QrCode className="w-4 h-4" />
                            </Button>
                            <Button
                                className="h-10 px-4 text-sm font-semibold"
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
                                <button
                                    type="button"
                                    key={tarima.tarimaId}
                                    onClick={() => setSelectedTarima(tarima)}
                                    className={`rounded-xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
                                        isSelected
                                            ? "border-primary bg-primary/10 shadow-md"
                                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                    }`}
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
                                    <div className="mt-3 flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Por: {tarima.usuarioCreo}</p>
                                        <div className="flex items-center gap-1">
                                            {tarima.cajasLlevamos === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarimaError(null); setDeleteTarimaConfirmId(tarima.tarimaId); }}
                                                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Eliminar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleReprintLabel(tarima.tarimaId); }}
                                                disabled={reprintLoadingId === tarima.tarimaId}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                                            >
                                                {reprintLoadingId === tarima.tarimaId
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Printer className="w-3 h-3" />
                                                }
                                                Etiqueta
                                            </button>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

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
                    {!isTarimasTerminadasLoading && !tarimasTerminadasError && tarimasTerminadas.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">Sin tarimas terminadas todavía.</p>
                    )}
                    {tarimasTerminadas.length > 0 && (
                        <Accordion type="single" collapsible className="space-y-2">
                            {tarimasTerminadas.map((tarima) => {
                                const defectCount = tarima.cajas.filter((c) => c.tieneDefectos).length;
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
                                                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                                        {tarima.cajasRegistradas} cj
                                                    </span>
                                                    {defectCount > 0 && (
                                                        <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                                                            {defectCount} def
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleReprintLabel(tarima.tarimaId); }}
                                                        disabled={reprintLoadingId === tarima.tarimaId}
                                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10"
                                                        title="Reimprimir etiqueta"
                                                    >
                                                        {reprintLoadingId === tarima.tarimaId
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <Printer className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-0 pb-0">
                                            <div className="px-4 pb-2 text-xs text-muted-foreground border-t border-border pt-2">
                                                Cerrada: {new Date(tarima.fechaCierre).toLocaleString()}
                                            </div>
                                            <div className="divide-y divide-border">
                                                {tarima.cajas.map((caja) => (
                                                    <div key={caja.detalleId} className="flex items-center justify-between gap-3 px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-sm">{caja.identificador}</p>
                                                            <p className="text-xs text-muted-foreground">{caja.cantidad} pz · {caja.piezasAuditadas} auditadas</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {caja.tieneDefectos && (
                                                                <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                                                                    Defecto
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => openEvidenceForCaja(caja.detalleId)}
                                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10"
                                                                title="Agregar fotos de evidencia"
                                                            >
                                                                <Camera className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

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
                                    <Input
                                        id="trazabilidad"
                                        className="h-14 text-base"
                                        value={trazabilidadInput}
                                        onChange={(e) => setTrazabilidadInput(e.target.value)}
                                        placeholder="Escanee o ingrese la trazabilidad"
                                        disabled={isRegisteringScan}
                                    />
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
                                            placeholder="Ej. 1000"
                                            disabled={isRegisteringScan}
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
                                    onClick={() => { if (!isRegisteringScan) setTieneDefectosInput(!tieneDefectosInput); }}
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
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="comentariosDefecto" className="text-base font-medium">
                                                Tipos de Defecto
                                            </Label>
                                            {comentariosDefectoInput.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {comentariosDefectoInput.length} seleccionado{comentariosDefectoInput.length > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                        <Popover open={isDefectoOpen} onOpenChange={setIsDefectoOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="comentariosDefecto"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isDefectoOpen}
                                                    className="h-14 w-full justify-between text-base border-2"
                                                    disabled={isRegisteringScan}
                                                >
                                                    <span className="truncate text-left">
                                                        {comentariosDefectoInput.length === 0
                                                            ? "Seleccione los defectos encontrados"
                                                            : comentariosDefectoInput.join(", ")}
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
                                                            {DEFECTO_OPTIONS.map((defecto) => {
                                                                const selected = comentariosDefectoInput.includes(defecto);
                                                                return (
                                                                    <CommandItem
                                                                        key={defecto}
                                                                        value={defecto}
                                                                        onSelect={(value) => {
                                                                            setComentariosDefectoInput((prev) =>
                                                                                prev.includes(value)
                                                                                    ? prev.filter((d) => d !== value)
                                                                                    : [...prev, value]
                                                                            );
                                                                            // No cerramos el popover para permitir selección múltiple
                                                                        }}
                                                                    >
                                                                        <Check className={`mr-2 h-5 w-5 ${selected ? "opacity-100" : "opacity-0"}`} />
                                                                        {defecto}
                                                                    </CommandItem>
                                                                );
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                                {comentariosDefectoInput.length > 0 && (
                                                    <div className="border-t p-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full text-xs text-muted-foreground"
                                                            onClick={() => setIsDefectoOpen(false)}
                                                        >
                                                            Listo ({comentariosDefectoInput.length} seleccionado{comentariosDefectoInput.length > 1 ? "s" : ""})
                                                        </Button>
                                                    </div>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                        {comentariosDefectoInput.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {comentariosDefectoInput.map((d) => (
                                                    <span
                                                        key={d}
                                                        className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded-full"
                                                    >
                                                        {d}
                                                        <button
                                                            type="button"
                                                            onClick={() => setComentariosDefectoInput((prev) => prev.filter((x) => x !== d))}
                                                            className="hover:opacity-70 leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
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
                                onClick={() => { setIsEvidenceModalOpen(false); setEvidenceTargetId(null); }}
                                disabled={isEvidenceUploading}
                            >
                                &times;
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            Suba fotos para el detalle #{evidenceTargetId ?? lastDetalleId}.
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
                                    className="flex-1 h-14 text-base"
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
                                    className="flex-1 h-14 text-base"
                                    onClick={() => { setIsEvidenceModalOpen(false); setEvidenceTargetId(null); }}
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
                                    Resultado
                                </Label>
                                <Select
                                    value={closeTarimaMotivo}
                                    onValueChange={setCloseTarimaMotivo}
                                    disabled={isClosingTarima}
                                    required
                                >
                                    <SelectTrigger className="w-full h-12">
                                        <SelectValue placeholder="Seleccione el resultado de la tarima" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tarima sin hallazgos">Tarima sin hallazgos</SelectItem>
                                        <SelectItem value="Tarima con hallazgos">Tarima con hallazgos</SelectItem>
                                        <SelectItem value="Tarima rechazada">Tarima rechazada</SelectItem>
                                    </SelectContent>
                                </Select>
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

            {isTarimaLabelOpen && tarimaLabelData && (
                <TarimaLabelModal
                    tarima={tarimaLabelData}
                    onClose={() => { setIsTarimaLabelOpen(false); setTarimaLabelData(null); }}
                />
            )}

            {isTarimaQROpen && (
                <TarimaQRModal
                    onClose={() => setIsTarimaQROpen(false)}
                    onUpdated={() => {
                        fetchTarimasActivas();
                        fetchTarimasTerminadas();
                        fetchDashboardData();
                    }}
                />
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
                                    <AlertCircle className="w-4 h-4" />
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
    
        </div>
    );
}

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Nota: El uso de 'use(params)' es correcto si esta página es un Server Component que debe leer una promesa.
    // Si tienes problemas, cambia 'params: Promise<{ id: string }>' por 'params: { id: string }' y elimina el use().
    const resolvedParams = use(params)
    return <VerificationDetail verificationId={resolvedParams.id} />
}
