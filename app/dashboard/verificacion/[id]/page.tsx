// src/components/verification-detail.tsx
"use client"

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

// Asegúrate de importar tus interfaces y componentes de UI
import { DashboardData } from '@/app/types/verification-types'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, QrCode, TrendingUp, Package, Hash, Truck, AlertCircle, Clock, Upload, CheckSquare } from 'lucide-react';

// ✅ CORRECCIÓN DE RUTA: Usamos el alias para importar el modal
import { VerificationScanModal } from '@/components/VerificationScanModal'; 

// URL Base de la API
const API_BASE_URL = "http://172.16.10.31/api";

interface VerificationDetailProps {
    verificationId: string;
}

export function VerificationDetail({ verificationId }: VerificationDetailProps) {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
    const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [finishMuestreo, setFinishMuestreo] = useState("");
    const [finishDefectos, setFinishDefectos] = useState("");
    const [finishComentarios, setFinishComentarios] = useState("");
    const [isFinishing, setIsFinishing] = useState(false);
    const [finishError, setFinishError] = useState<string | null>(null);
    const [finishSuccess, setFinishSuccess] = useState<string | null>(null);
    
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

    // Ejecutar el fetch al montar el componente y cuando el ID cambie
    useEffect(() => {
        if (verificationId) {
            fetchDashboardData();
        }
    }, [verificationId]);
    
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

    // --- Renderizado del Dashboard (FASE 2) ---

    // Aseguramos que el ID de la API sea un número para el modal
    const verifiedIdNumber = dashboardData.verificacionId;

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

        setIsEvidenceUploading(true);

        try {
            const formData = new FormData();
            formData.append("VerificacionId", String(verifiedIdNumber));
            selectedEvidenceFiles.forEach((file) => formData.append("Fotos", file));

            const response = await fetch(`${API_BASE_URL}/Verificacion/subir-evidencia`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error (${response.status}) al subir evidencia.`);
            }

            setEvidenceSuccess("Evidencia subida correctamente.");
            setSelectedEvidenceFiles([]);
        } catch (err: any) {
            setEvidenceError(err.message || "Error de conexión al subir la evidencia.");
        } finally {
            setIsEvidenceUploading(false);
        }
    };

    const handleFinishSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFinishError(null);
        setFinishSuccess(null);

        if (!finishMuestreo || !finishDefectos || !finishComentarios) {
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
                    defectosEncontrados: finishDefectos,
                    comentarios: finishComentarios,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error (${response.status}) al finalizar la verificación.`);
            }

            setFinishSuccess("Verificación finalizada correctamente.");
            setFinishMuestreo("");
            setFinishDefectos("");
            setFinishComentarios("");
            fetchDashboardData();
            setIsFinishModalOpen(false);
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
                    <p className="text-sm text-muted-foreground ml-9">Producto Info: {dashboardData.productoInfo}</p>
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
            
            {/* Botón de Acción Clave: Abre el Modal de Escaneo (POST) */}
            <Button 
                className="w-full h-12 text-lg bg-primary hover:bg-primary/90 mt-6" 
                onClick={() => setIsScanModalOpen(true)}
                disabled={dashboardData.estado !== "EN PROCESO"} // Deshabilitar si no está activo
            >
                <QrCode className="w-5 h-5 mr-2" />
                Agregar Cajas Individuales
            </Button>

            {/* Botón para subir evidencia */}
            <Button
                variant="secondary"
                className="w-full h-12 text-lg mt-3"
                onClick={() => {
                    setEvidenceError(null);
                    setEvidenceSuccess(null);
                    setIsEvidenceModalOpen(true);
                }}
                disabled={dashboardData.estado !== "EN PROCESO"}
            >
                <Upload className="w-5 h-5 mr-2" />
                Agregar evidencia
            </Button>

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
            
            {/* Modal de Escaneo */}
            {isScanModalOpen && (
                <VerificationScanModal 
                    verificacionId={verifiedIdNumber} // Pasamos el ID numérico
                    onClose={() => setIsScanModalOpen(false)} 
                    onSuccess={() => { 
                        setIsScanModalOpen(false); 
                        fetchDashboardData(); // RECARGAR para actualizar el Avance
                    }}
                />
            )}

            {/* Modal de Evidencia */}
            {isEvidenceModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Upload className="w-5 h-5 text-primary" /> Subir evidencia
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
                            Seleccione una o varias fotos que respalden la verificación #{verifiedIdNumber}.
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
                                <Label htmlFor="defectos" className="text-card-foreground">
                                    Defectos encontrados
                                </Label>
                                <Textarea
                                    id="defectos"
                                    value={finishDefectos}
                                    onChange={(e) => setFinishDefectos(e.target.value)}
                                    placeholder="Describa los defectos detectados (si aplica)"
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
    const resolvedParams = use(params)
    return <VerificationDetail verificationId={resolvedParams.id} />
}
