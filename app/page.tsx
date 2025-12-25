import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  redirect("/projects");
}
