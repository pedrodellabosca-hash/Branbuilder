import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Dashboard home redirects to /projects
export default async function DashboardHomePage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    // The main dashboard view is the projects page
    redirect("/projects");
}
