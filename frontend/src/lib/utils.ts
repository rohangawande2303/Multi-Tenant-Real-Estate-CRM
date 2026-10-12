import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge tailwind classes safely.
 * Combines clsx for conditional classes and twMerge for resolving conflicts.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
