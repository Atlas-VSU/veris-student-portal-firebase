import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_20px_-2px_rgba(93,112,82,0.15)] hover:shadow-[0_6px_24px_-4px_rgba(93,112,82,0.25)]",
        destructive:
          "bg-destructive text-white shadow-[0_4px_20px_-2px_rgba(168,84,72,0.15)] hover:shadow-[0_6px_24px_-4px_rgba(168,84,72,0.25)]",
        outline:
          "border-2 border-secondary bg-transparent text-secondary hover:bg-secondary/10",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_20px_-2px_rgba(193,140,93,0.15)] hover:shadow-[0_6px_24px_-4px_rgba(193,140,93,0.25)]",
        success:
          "bg-primary text-primary-foreground shadow-[0_4px_20px_-2px_rgba(93,112,82,0.15)] hover:shadow-[0_6px_24px_-4px_rgba(93,112,82,0.25)]",
        ghost:
          "text-primary bg-transparent hover:bg-primary/10",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        icon: "p-0 rounded-full border-transparent hover:scale-110 hover:bg-primary/10",
      },
      size: {
        default: "h-12 px-8 py-3 text-base",
        sm: "h-10 px-6 py-2 text-sm",
        lg: "h-14 px-10 py-4 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
