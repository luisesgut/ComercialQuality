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

const ANNOUNCEMENT_STORAGE_KEY = "destiny-consecutivos-sispro-turno-v2"

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

  
}
