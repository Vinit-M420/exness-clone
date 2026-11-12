"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// shadcn/ui sonner wrapper - pinned to dark since the app has no theme switcher
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "#1a1d2e",
          "--normal-text": "#E8E9ED",
          "--normal-border": "#1f2937",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
