"use client"

import { useEffect, useState } from "react"
import { CheckSquare, Megaphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ANNOUNCEMENT_STORAGE_KEY = "caja-sin-etiqueta-v1"

export function UpdateAnnouncementModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const hasSeenAnnouncement =
      window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === "seen"

    if (!hasSeenAnnouncement) {
      setOpen(true)
    }
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "seen")
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <DialogTitle>Nueva opción: caja sin etiqueta</DialogTitle>
          <DialogDescription className="pt-2 text-left leading-6">
            En el registro de cajas se agregó la opción <strong>Sin Etiqueta</strong>. Úsala únicamente cuando la caja
            física no cuente con una etiqueta de identificación.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p>
            Al marcar el check, el sistema registra automáticamente el defecto <strong>Sin Etiqueta / Falta de
            Etiqueta</strong>. Después podrás agregar fotografías como evidencia.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
