import { NextResponse } from "next/server";
import { getModelsResponse } from "@/lib/ai/model-registry";

export const dynamic = "force-dynamic";

export async function GET() {
    const response = await getModelsResponse();
    return NextResponse.json(response);
}
