"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-green-600 dark:text-green-400" />,
        info: <InfoIcon className="size-4 text-blue-600 dark:text-blue-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-600 dark:text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:shadow-xl pointer-events-auto",
          success: "group-[.toaster]:!bg-green-50 group-[.toaster]:!text-green-800 group-[.toaster]:!border-green-600 dark:group-[.toaster]:!bg-[#0f1d11] dark:group-[.toaster]:!text-green-300 dark:group-[.toaster]:!border-green-800",
          error: "group-[.toaster]:!bg-red-50 group-[.toaster]:!text-red-800 group-[.toaster]:!border-red-600 dark:group-[.toaster]:!bg-[#1d0f0f] dark:group-[.toaster]:!text-red-300 dark:group-[.toaster]:!border-red-800",
          warning: "group-[.toaster]:!bg-amber-50 group-[.toaster]:!text-amber-800 group-[.toaster]:!border-amber-600 dark:group-[.toaster]:!bg-[#1d190f] dark:group-[.toaster]:!text-amber-300 dark:group-[.toaster]:!border-amber-800",
          info: "group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-800 group-[.toaster]:!border-blue-600 dark:group-[.toaster]:!bg-[#0f171d] dark:group-[.toaster]:!text-blue-300 dark:group-[.toaster]:!border-blue-800",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:!opacity-100 group-[.toast]:!visible !cursor-pointer group-[.toast]:border-2 group-[.toast]:!rounded-full group-data-[type=success]:!text-green-800 group-data-[type=success]:!bg-green-50 group-data-[type=success]:!border-green-600 group-data-[type=error]:!text-red-800 group-data-[type=error]:!bg-red-50 group-data-[type=error]:!border-red-600 group-data-[type=warning]:!text-amber-800 group-data-[type=warning]:!bg-amber-50 group-data-[type=warning]:!border-amber-600 group-data-[type=info]:!text-blue-800 group-data-[type=info]:!bg-blue-50 group-data-[type=info]:!border-blue-600 dark:group-data-[type=success]:!text-green-300 dark:group-data-[type=success]:!bg-[#0f1d11] dark:group-data-[type=success]:!border-green-800 dark:group-data-[type=error]:!text-red-300 dark:group-data-[type=error]:!bg-[#1d0f0f] dark:group-data-[type=error]:!border-red-800 dark:group-data-[type=warning]:!text-amber-300 dark:group-data-[type=warning]:!bg-[#1d190f] dark:group-data-[type=warning]:!border-amber-800 dark:group-data-[type=info]:!text-blue-300 dark:group-data-[type=info]:!bg-[#0f171d] dark:group-data-[type=info]:!border-blue-800 group-[.toast]:hover:scale-110 transition-transform",
        },
      }}
      style={{
        zIndex: 99999,
      } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
