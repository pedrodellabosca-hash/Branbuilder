
/**
 * Anthropic Provider
 * 
 * Integration with Claude models (Haiku, Sonnet, Opus).
 * Requires ANTHROPIC_API_KEY environment variable.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIRequest, AIResponse, AIProviderStatus } from "./types";

const DEFAULT_MODEL = "claude-3-5-haiku-latest";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export class AnthropicProvider implements AIProvider {
    readonly type = "ANTHROPIC" as const;
    private client: Anthropic | null = null;
    private model: string;

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        this.model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

        if (apiKey) {
            this.client = new Anthropic({
                apiKey: apiKey,
            });
        }
    }

    async checkStatus(): Promise<AIProviderStatus> {
        if (!this.client) {
            return {
                provider: "ANTHROPIC",
                ready: false,
                error: "ANTHROPIC_API_KEY not configured",
            };
        }

        return {
            provider: "ANTHROPIC",
            ready: true,
        };
    }

    async complete(request: AIRequest): Promise<AIResponse> {
        if (!this.client) {
            const error = new Error("ANTHROPIC_API_KEY not configured");
            (error as any).code = "PROVIDER_NOT_CONFIGURED";
            throw error;
        }

        const model = request.model || this.model;
        const maxTokens = request.maxTokens || DEFAULT_MAX_TOKENS;
        const temperature = request.temperature ?? DEFAULT_TEMPERATURE;

        try {
            // Map generic messages to Anthropic format
            // System message is separate in Anthropic API
            const systemMessage = request.messages.find(m => m.role === "system");
            const userMessages = request.messages.filter(m => m.role !== "system");

            const response = await this.client.messages.create({
                model: model,
                max_tokens: maxTokens,
                temperature: temperature,
                system: systemMessage?.content,
                messages: userMessages.map(m => ({
                    role: m.role as "user" | "assistant",
                    content: m.content
                })),
            });

            // Handle content block
            const textContent = response.content
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join("\n");

            return {
                content: textContent,
                model: response.model,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                },
                finishReason: response.stop_reason === "end_turn" ? "stop" : "length",
            };

        } catch (error: any) {
            console.error("Anthropic API Error:", error);
            throw new Error(`Anthropic Error: ${error.message || "Unknown error"}`);
        }
    }
}
