"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerModalProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerId = "qr-scanner-container";
    const [error, setError] = useState<string | null>(null);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const startScanner = async () => {
            try {
                const scanner = new Html5Qrcode(containerId);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    (decodedText) => {
                        if (cancelled) return;
                        onScan(decodedText.trim());
                        onClose();
                    },
                    undefined
                );

                if (!cancelled) setStarted(true);
            } catch (err: any) {
                if (!cancelled) {
                    setError(
                        err?.message?.includes("Permission")
                            ? "Permiso de cámara denegado. Habilítelo en la configuración del navegador."
                            : "No se pudo iniciar la cámara."
                    );
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="font-semibold text-base">Escanear QR de trazabilidad</p>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-4 space-y-3">
                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <CameraOff className="w-10 h-10 text-muted-foreground" />
                            <p className="text-sm text-destructive">{error}</p>
                            <Button variant="outline" onClick={onClose}>Cerrar</Button>
                        </div>
                    ) : (
                        <>
                            <div
                                id={containerId}
                                className="w-full rounded-xl overflow-hidden bg-black"
                                style={{ minHeight: 300 }}
                            />
                            {!started && (
                                <p className="text-xs text-center text-muted-foreground">
                                    Iniciando cámara...
                                </p>
                            )}
                            <p className="text-xs text-center text-muted-foreground">
                                Apunta la cámara al código QR de la trazabilidad
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
