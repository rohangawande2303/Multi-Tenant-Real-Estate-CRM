/**
 * File: src/contexts/theme-context.tsx
 * Purpose: Theme state management with system preference sync & persistent storage
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark");
    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

    const applyTheme = (targetTheme: Theme) => {
        const root = window.document.documentElement;
        let effective: "dark" | "light" = "dark";

        if (targetTheme === "system") {
            effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } else {
            effective = targetTheme;
        }

        root.classList.remove("light", "dark");
        root.classList.add(effective);
        setResolvedTheme(effective);
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem("sp_crm_theme") as Theme | null;
        const initialTheme: Theme = savedTheme || "dark";
        setThemeState(initialTheme);
        applyTheme(initialTheme);

        // Listen for OS theme preference changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const current = localStorage.getItem("sp_crm_theme") as Theme | null;
            if (current === "system" || !current) {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);
        localStorage.setItem("sp_crm_theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
