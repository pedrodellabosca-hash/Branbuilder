/**
 * Mock AI Provider
 * 
 * Deterministic mock for development and testing.
 * Does not make any external API calls.
 */

import type { AIProvider, AIRequest, AIResponse, AIProviderStatus } from "./types";

export class MockAIProvider implements AIProvider {
    readonly type = "MOCK" as const;

    async checkStatus(): Promise<AIProviderStatus> {
        return {
            provider: "MOCK",
            ready: true,
        };
    }

    async complete(request: AIRequest): Promise<AIResponse> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Extract last user message for context
        const lastUserMessage = request.messages
            .filter((m) => m.role === "user")
            .pop();

        const prompt = lastUserMessage?.content || "";

        // Deterministic mock response based on input
        const content = this.generateMockResponse(prompt);

        return {
            content,
            model: "mock-v1",
            usage: {
                promptTokens: this.estimateTokens(prompt),
                completionTokens: this.estimateTokens(content),
                totalTokens: this.estimateTokens(prompt) + this.estimateTokens(content),
            },
            finishReason: "stop",
        };
    }

    private generateMockResponse(prompt: string): string {
        // Deterministic responses for testing
        if (prompt.toLowerCase().includes("naming")) {
            return JSON.stringify({
                title: "Propuesta de Naming",
                options: [
                    { name: "BrandVox", rationale: "Combina brand + voz" },
                    { name: "IdentityForge", rationale: "Forja de identidad" },
                    { name: "BrandCore", rationale: "Núcleo de marca" },
                ],
            });
        }

        if (prompt.toLowerCase().includes("manifesto")) {
            return JSON.stringify({
                title: "Manifiesto de Marca",
                content: "Creemos en el poder de las marcas auténticas...",
                values: ["Autenticidad", "Innovación", "Conexión"],
            });
        }

        // Default response
        return JSON.stringify({
            title: "Contenido Generado",
            content: `Respuesta mock para: ${prompt.slice(0, 50)}...`,
            generated: true,
            timestamp: new Date().toISOString(),
        });
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 chars per token
        return Math.ceil(text.length / 4);
    }
}
