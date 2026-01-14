/**
 * OpenAI Provider
 * 
 * Real OpenAI API integration.
 * Requires OPENAI_API_KEY environment variable.
 */

import type { AIProvider, AIRequest, AIResponse, AIProviderStatus } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

export class OpenAIProvider implements AIProvider {
    readonly type = "OPENAI" as const;
    private apiKey: string | undefined;
    private model: string;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    }

    async checkStatus(): Promise<AIProviderStatus> {
        if (!this.apiKey) {
            return {
                provider: "OPENAI",
                ready: false,
                error: "OPENAI_API_KEY not configured",
            };
        }

        // Key exists, assume ready (avoid API call to save tokens)
        return {
            provider: "OPENAI",
            ready: true,
        };
    }

    async complete(request: AIRequest): Promise<AIResponse> {
        if (!this.apiKey) {
            const error = new Error("OPENAI_API_KEY not configured");
            (error as any).code = "PROVIDER_NOT_CONFIGURED";
            throw error;
        }

        const model = request.model || this.model;
        const maxTokens = request.maxTokens || DEFAULT_MAX_TOKENS;
        const temperature = request.temperature ?? DEFAULT_TEMPERATURE;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: request.messages,
                max_tokens: maxTokens,
                temperature,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                `OpenAI API error: ${response.status} - ${error.error?.message || "Unknown error"}`
            );
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (!choice) {
            throw new Error("No completion returned from OpenAI");
        }

        return {
            content: choice.message?.content || "",
            model: data.model,
            usage: data.usage
                ? {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                }
                : undefined,
            finishReason: choice.finish_reason === "stop" ? "stop" : "length",
        };
    }
}
