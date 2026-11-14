"use client"

import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// shadcn/ui sonner wrapper - pinned to dark since the app has no theme switcher.
// Colours live in globals.css ("Toasts") so they come from the --exness-* palette.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4" />,
        error: <CircleX className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
