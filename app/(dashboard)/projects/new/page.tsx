// Server Component wrapper that exports route config
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import NewProjectClient from "./client";

export default function NewProjectPage() {
    return <NewProjectClient />;
}
