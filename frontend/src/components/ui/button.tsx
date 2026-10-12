import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.99]",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20",
                hero:
                    "purple-gradient text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 rounded-full font-semibold",
                secondary:
                    "bg-secondary/80 text-foreground border border-border/70 shadow-sm hover:bg-secondary hover:border-border",
                outline:
                    "border border-border bg-card shadow-sm hover:bg-secondary/60 hover:text-foreground hover:border-border-strong",
                ghost:
                    "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                destructive:
                    "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 hover:border-destructive/30",
                link:
                    "text-primary underline-offset-4 hover:underline p-0 h-auto font-normal",
                glass:
                    "glass-panel text-foreground hover:bg-secondary/40 shadow-sm",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 px-3 text-xs rounded-lg",
                lg: "h-11 px-6 text-sm rounded-xl",
                icon: "h-10 w-10 p-0",
                pill: "h-10 px-5 rounded-full",
                "pill-sm": "h-8 px-3.5 text-xs rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
        if (asChild) {
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
                    {children}
                </Slot>
            )
        }
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
