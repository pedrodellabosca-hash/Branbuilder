// Route segment config for all dashboard routes
// Forces dynamic rendering for all pages that require auth context

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Template({ children }: { children: React.ReactNode }) {
    return children;
}
