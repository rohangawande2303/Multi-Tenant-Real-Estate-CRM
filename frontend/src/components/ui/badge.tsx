import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-primary/20 bg-primary/10 text-primary",
                secondary:
                    "border-border bg-secondary/80 text-secondary-foreground",
                destructive:
                    "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                outline:
                    "border-border text-foreground bg-transparent",
                success:
                    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                warning:
                    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                info:
                    "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
