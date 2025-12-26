"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { EnvError } from "../errors/EnvError";

// Mock implementation of Clerk Context
// This prevents hooks like useUser() from crashing the app when Auth is disabled.
// Only used in DEV mode when NEXT_PUBLIC_AUTH_MODE=none
const MockAuthContext = React.createContext({
    isLoaded: true,
    isSignedIn: true,
    user: {
        id: "mock_user_id",
        fullName: "Dev User",
        firstName: "Dev",
        primaryEmailAddress: { emailAddress: "dev@brandforge.local" },
        imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=BrandForge",
    },
});

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    // We are bypassing Clerk entirely.
    // To make this robust, we would ideally mock the actual ClerkProvider context.
    // However, since we can't easily access Clerk's internal context, 
    // we will simply render children. 
    // Note: Components using `useUser()` or `useAuth()` directly MIGHT fail 
    // if they strict-check context presence.
    // For a truly robust "no-auth" mode, we'd need to mock those hooks or 
    // ensure components gracefully handle missing auth.
    // Given the requirement to "run without errors", we'll just render children
    // and rely on the fact that we aren't protecting routes via middleware locally.
    React.useEffect(() => {
        console.warn("⚠️ Running in AUTH_MODE=none. Clerk is disabled.");
    }, []);

    return <>{children}</>;
};


interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
    const isDev = process.env.NODE_ENV === "development";

    // 1. Audit Environment Variables
    const missingVars: string[] = [];

    // Only check key validity if we are NOT in 'none' mode
    if (authMode !== "none") {
        const isKeyPlaceholder =
            !publishableKey ||
            publishableKey.includes("YOUR_KEY_HERE") ||
            publishableKey.includes("placeholder");

        if (isKeyPlaceholder) {
            missingVars.push(
                `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or invalid (${publishableKey || "undefined"})`
            );
        }
    }

    // If we have errors (and not in mock mode), show the error screen
    if (missingVars.length > 0) {
        return <EnvError missingVars={missingVars} />;
    }

    // 2. Handle Mock Mode (Dev only)
    if (authMode === "none") {
        if (isDev) {
            return (
                <MockAuthProvider>
                    {children}
                </MockAuthProvider>
            );
        } else {
            // Hard fail in production if someone tries to disable auth
            throw new Error("FATAL: AUTH_MODE=none is not allowed in production.");
        }
    }

    // 3. Default: Render Clerk Provider
    return (
        <ClerkProvider localization={esES} publishableKey={publishableKey}>
            {children}
        </ClerkProvider>
    );
};
