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

const ANNOUNCEMENT_STORAGE_KEY = "destiny-consecutivos-precargados-v1"

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
        <DialogHeader className="gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <DialogTitle>Actualización en producto Destiny</DialogTitle>
            <DialogDescription className="text-base leading-6">
              Ya no es necesario ingresar el consecutivo manual. Los consecutivos
              ya vienen precargados.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6 text-foreground">
          Solo elige la máquina, selecciona el consecutivo y continúa tu proceso.
        </div>

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
