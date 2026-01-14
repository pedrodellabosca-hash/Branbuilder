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
        const p = prompt.toLowerCase();

        // 1. Context
        if (p.includes("context") || p.includes("summary")) {
            return JSON.stringify({
                marketSummary: "El mercado de soluciones B2B está saturado pero fragmentado...",
                targetAudience: {
                    demographics: "Empresas tech de 50-200 empleados en LATAM/US",
                    psychographics: "Buscan eficiencia y escalabilidad, valoran el diseño",
                    painPoints: ["Procesos manuales lentos", "Falta de consistencia"],
                    needs: ["Automatización inteligente", "Resultados predecibles"]
                },
                competitorAnalysis: {
                    direct: ["Competidor A", "Competidor B"],
                    indirect: ["Hojas de cálculo", "Consultores tradicionales"],
                    differentiation: "Enfoque híbrido AI + Humano con calidad de agencia"
                },
                positioningStatement: "Para empresas que escalan, BrandForge es la plataforma que..."
            });
        }

        // 2. Naming
        if (p.includes("naming") || p.includes("names")) {
            return JSON.stringify({
                title: "Exploración de Naming",
                options: [
                    { name: "BrandForge", rationale: "Evoca construcción sólida y artesanía digital." },
                    { name: "NexusCore", rationale: "Conexión central de la estrategia de marca." },
                    { name: "AuraSys", rationale: "Sistema que proyecta el aura de la marca." },
                    { name: "Stratos", rationale: "Elevación estratégica y visión global." }
                ],
                recommendation: "BrandForge es el candidato más fuerte por su sonoridad..."
            });
        }

        // 3. Manifesto
        if (p.includes("manifesto") || p.includes("manifiesto") || p.includes("values")) {
            return JSON.stringify({
                title: "Manifiesto de Marca",
                content: "Creemos que las marcas no se inventan, se descubren. En un mundo de ruido infinito, la claridad es la única moneda que importa. No construimos fachadas efímeras; forjamos identidades que resisten el paso del tiempo y conectan con la verdad humana.",
                values: ["Verdad Radical", "Artesanía Digital", "Impacto Medible"],
                principles: ["Primero la estrategia", "Diseño con propósito"]
            });
        }

        // 4. Voice
        if (p.includes("voice") || p.includes("voz") || p.includes("tone") || p.includes("tono")) {
            return JSON.stringify({
                title: "Voz y Tono",
                tone: "Autoritario pero empático. Experto, directo y sin jerga innecesaria.",
                personality: "El Arquitecto Visionario.",
                dos: ["Usar verbos activos", "Ser conciso", "Celebrar el logro del usuario"],
                donts: ["Usar pasiva excesiva", "Ser condescendiente", "Usar metáforas confusas"],
                examples: [
                    { context: "Email", good: "Analizamos tus datos.", bad: "Se realizó el análisis." }
                ]
            });
        }

        // 5. Tagline
        if (p.includes("tagline")) {
            return JSON.stringify({
                title: "Propuestas de Tagline",
                options: [
                    { tagline: "Forjando el futuro de tu marca.", rationale: "Acción directa." },
                    { tagline: "Estrategia que escala.", rationale: "Beneficio claro." },
                    { tagline: "Tu identidad, amplificada.", rationale: "Promesa de valor." }
                ],
                recommendation: "Estrategia que escala."
            });
        }

        // Fallback for generic or Module B placeholders
        return JSON.stringify({
            generated: true,
            mockType: "generic",
            content: `Mock response for: ${prompt.slice(0, 30)}...`
        });
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 chars per token
        return Math.ceil(text.length / 4);
    }
}
