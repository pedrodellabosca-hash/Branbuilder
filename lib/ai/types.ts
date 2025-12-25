/**
 * AI Provider Types
 * 
 * Interfaces for AI provider abstraction layer.
 * Used by all AI providers (OpenAI, Mock, future providers).
 */

export type AIProviderType = "OPENAI" | "MOCK";

export interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIRequest {
    messages: AIMessage[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AIResponse {
    content: string;
    model: string;
    usage?: TokenUsage;
    finishReason?: "stop" | "length" | "error";
}

export interface AIProviderStatus {
    provider: AIProviderType;
    ready: boolean;
    error?: string;
}

/**
 * AI Provider Interface
 * All providers must implement this interface.
 */
export interface AIProvider {
    /** Provider identifier */
    readonly type: AIProviderType;

    /** Check if provider is configured and ready */
    checkStatus(): Promise<AIProviderStatus>;

    /** Generate completion from messages */
    complete(request: AIRequest): Promise<AIResponse>;
}
