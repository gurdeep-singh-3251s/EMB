export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  debug?: boolean;
  debugMaxChars?: number;
}

import { SYSTEM_JSON_SECURITY } from "../schema/promptSecurity";

export class OpenRouterService {
  constructor(private readonly config: OpenRouterConfig) {}

  private debugLog(label: string, text: string) {
    if (!this.config.debug) return;
    const max = this.config.debugMaxChars ?? 4000;
    const clipped =
      text.length > max ? `${text.slice(0, max)}\n…(clipped ${text.length - max} chars)` : text;
    console.log(`[openrouter][${label}] ${clipped}`);
  }

  private extractJsonBlob(text: string): string | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return text.slice(start, end + 1);
    }

    const withCustomer = text.match(/\{[^{}]*"customer_name"\s*:[^{}]*\}/);
    if (withCustomer?.[0]) return withCustomer[0];

    const withDocument = text.match(/\{[^{}]*"document_type"\s*:[^{}]*\}/);
    if (withDocument?.[0]) return withDocument[0];

    return null;
  }

  private cleanModelContent(raw: string): string {
    return raw
      .replace(/[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, "")
      .trim();
  }

  private resolveContent(message: { content?: string | null; reasoning?: string | null }): string {
    const rawContent = message.content ?? "";
    const cleaned = this.cleanModelContent(rawContent);
    const fromContent = this.extractJsonBlob(cleaned);
    if (fromContent) return fromContent;

    const reasoning = message.reasoning ?? "";
    if (reasoning) {
      const fromReasoning = this.extractJsonBlob(reasoning);
      if (fromReasoning) {
        this.debugLog("fallback:reasoning-json", fromReasoning);
        return fromReasoning;
      }
    }

    return cleaned;
  }

  async completeJson(prompt: string, meta?: { step: string; model?: string }): Promise<string> {
    const step = meta?.step ?? "request";
    const model = meta?.model ?? this.config.model;
    this.debugLog(`${step}:prompt`, prompt);

    const baseUrl = this.config.baseUrl ?? "https://openrouter.ai/api/v1";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_JSON_SECURITY },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        reasoning: { effort: "none" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; reasoning?: string | null } }>;
    };

    const message = json.choices?.[0]?.message;
    if (!message) throw new Error("OpenRouter returned no message");

    this.debugLog(`${step}:raw-content`, message.content ?? "");
    if (message.reasoning) this.debugLog(`${step}:raw-reasoning`, message.reasoning);

    const content = this.resolveContent(message);
    if (!content || !content.includes("{")) {
      throw new Error(
        `OpenRouter returned no usable JSON (content=${JSON.stringify(message.content?.slice(0, 80))})`,
      );
    }

    this.debugLog(`${step}:resolved`, content);
    return content;
  }
}
