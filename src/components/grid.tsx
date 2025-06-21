import type React from "react"
import { cn } from "@/lib/utils"

type DecoratorPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right"

interface GridProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
  noBorder?: "top" | "right" | "bottom" | "left" | "all" | "none"
  connectTo?: "top" | "bottom" | "none"
  hideDecorators?: boolean
  decoratorPositions?: DecoratorPosition[]
}

export function Grid({
  children,
  className,
  columns = 1,
  noBorder = "none",
  connectTo = "none",
  hideDecorators = false,
  decoratorPositions = ["top-left", "bottom-right"],
}: GridProps) {
  const getDecoratorClasses = (position: DecoratorPosition) => {
    const baseClasses = "absolute w-5 h-5 z-10 flex items-center justify-center"
    
    switch (position) {
      case "top-left":
        return cn(baseClasses, "top-0 left-0 translate-x-[-50%] translate-y-[-50%]")
      case "top-right":
        return cn(baseClasses, "top-0 right-0 translate-x-[50%] translate-y-[-50%]")
      case "bottom-left":
        return cn(baseClasses, "bottom-0 left-0 translate-x-[-50%] translate-y-[50%]")
      case "bottom-right":
        return cn(baseClasses, "bottom-0 right-0 translate-x-[50%] translate-y-[50%]")
      default:
        return baseClasses
    }
  }

  const DecoratorIcon = () => (
    <svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2V10" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 6H10" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )

  return (
    <div
      className={cn(
        "relative border border-gray-200",
        noBorder === "top" && "border-t-0",
        noBorder === "right" && "border-r-0",
        noBorder === "bottom" && "border-b-0",
        noBorder === "left" && "border-l-0",
        noBorder === "all" && "border-0",
        connectTo === "top" && "-mt-px",
        connectTo === "bottom" && "-mb-px",
        className,
      )}
    >
      {!hideDecorators && decoratorPositions.map((position) => (
        <div key={position} className={getDecoratorClasses(position)}>
          <DecoratorIcon />
        </div>
      ))}
      <div
        className={cn(
          "grid gap-px bg-gray-200",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns === 3 && "grid-cols-1 md:grid-cols-3",
          columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function GridItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-white p-8", className)}>{children}</div>
}