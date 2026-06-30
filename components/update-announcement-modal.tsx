"use client"

import { useEffect, useState } from "react"
import { Megaphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ANNOUNCEMENT_STORAGE_KEY = "tarima-defecto-cierre-v1"

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
          <DialogTitle>Nuevo requisito al cerrar tarimas</DialogTitle>
          <DialogDescription className="pt-2 text-left leading-6">
            Al cerrar una tarima como <strong>Rechazada</strong> o <strong>Desviación</strong>, ahora es necesario
            seleccionar el defecto principal por el cual se descarta o desvía la tarima.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Este defecto se toma del catálogo de defectos usado para cajas y se enviará junto con el cierre de la tarima.
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
