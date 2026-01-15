const SENSITIVE_KEY_PATTERN = /(token|secret|authorization|api[-_]?key|password|key)/i;

export function redactSecrets<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => redactSecrets(item)) as T;
    }

    if (value && typeof value === "object") {
        const output: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                output[key] = "[REDACTED]";
            } else {
                output[key] = redactSecrets(val);
            }
        }
        return output as T;
    }

    return value;
}
