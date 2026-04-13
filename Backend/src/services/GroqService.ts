// Shared Groq API client with timeout, logging, and budget tracking
import config from '../config/env';
import { logger } from '../middleware/logging';
import { supabase } from '../config/supabase';
import { AppError, Errors } from '../lib/errors';

export interface GroqCallOptions {
  modelName?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GroqCallResult<T = any> {
  output: T;
  tokenCount: number;
  latencyMs: number;
}

function toAppErrorIfRecoverable(error: Error): AppError | null {
  const message = error.message.toLowerCase();

  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded') ||
    message.includes('quota')
  ) {
    return new AppError(429, 'AI_RATE_LIMIT', 'Groq quota exceeded. Please try again later.');
  }

  if (
    message.includes('permission denied') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('api key')
  ) {
    return Errors.AI_UNAVAILABLE();
  }

  if (message.includes('timeout')) {
    return Errors.REQUEST_TIMEOUT();
  }

  return null;
}

function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim();

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function parseGroqJson<T>(rawText: string): T {
  const candidates: string[] = [];
  const trimmed = rawText.trim();

  candidates.push(trimmed);

  const extracted = extractJsonText(trimmed);
  if (extracted !== trimmed) {
    candidates.push(extracted);
  }

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  if (withoutFences && !candidates.includes(withoutFences)) {
    candidates.push(withoutFences);
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const objectSlice = trimmed.slice(firstBrace, lastBrace + 1).trim();
    if (!candidates.includes(objectSlice)) {
      candidates.push(objectSlice);
    }
  }

  const deTrailingComma = (candidates[candidates.length - 1] || trimmed).replace(/,\s*([}\]])/g, '$1');
  if (deTrailingComma && !candidates.includes(deTrailingComma)) {
    candidates.push(deTrailingComma);
  }

  let lastParseError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastParseError = error as Error;
    }
  }

  throw lastParseError || new Error('Failed to parse Groq JSON response');
}

/**
 * Call Groq API with structured output, timeout, and telemetry
 */
export async function callGroq<T = any>(
  prompt: string,
  aiToolType: string,
  promptVersion: string,
  brandId: string,
  campaignId: string | null,
  options: GroqCallOptions = {}
): Promise<GroqCallResult<T>> {
  const {
    modelName = config.GROQ_MODEL,
    timeoutMs = config.GROQ_TIMEOUT_MS,
    maxRetries = 1,
  } = options;

  if (!config.GROQ_API_KEY) {
    throw Errors.AI_UNAVAILABLE();
  }

  const startTime = Date.now();
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      const url = 'https://api.groq.com/openai/v1/chat/completions';

      const requestBody = {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a strict JSON API. Return only valid JSON and never wrap output in markdown fences.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      };

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Groq] HTTP error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 300),
        });

        if (response.status === 429) {
          throw new AppError(429, 'AI_RATE_LIMIT', 'Groq quota exceeded. Please try again later.');
        } else if (response.status === 401 || response.status === 403) {
          throw Errors.AI_UNAVAILABLE();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (!text || typeof text !== 'string') {
        logger.error('[Groq] Unexpected response structure', {
          data: JSON.stringify(data).substring(0, 300),
        });
        throw Errors.INTERNAL_ERROR('AI returned unexpected response structure');
      }

      let parsedOutput: T;
      try {
        parsedOutput = parseGroqJson<T>(text);
      } catch (parseError) {
        logger.error('[Groq] Failed to parse JSON response', {
          aiToolType,
          promptVersion,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          text: text.substring(0, 300),
        });
        throw Errors.INTERNAL_ERROR('AI returned invalid JSON');
      }

      const latencyMs = Date.now() - startTime;
      const tokenCount = Number(data?.usage?.total_tokens || 0);

      logger.info('[Groq] API call succeeded', {
        aiToolType,
        promptVersion,
        latencyMs,
        tokenCount,
        attempt,
        model: modelName,
      });

      incrementAiBudget(brandId, aiToolType, campaignId, promptVersion, tokenCount, latencyMs, true).catch(
        (err) => logger.error('[Groq] Failed to increment budget', { error: err })
      );

      return {
        output: parsedOutput,
        tokenCount,
        latencyMs,
      };
    } catch (error: any) {
      lastError = error;

      if (error?.name === 'AbortError') {
        lastError = new Error('Groq API timeout');
      }

      const normalizedError = toAppErrorIfRecoverable(lastError as Error);
      if (normalizedError) {
        throw normalizedError;
      }

      const errorMessage = lastError?.message ?? 'Unknown Groq error';

      logger.error('[Groq] API call failed', {
        aiToolType,
        promptVersion,
        attempt,
        error: errorMessage,
      });

      if (lastError instanceof AppError) {
        throw lastError;
      }

      if (errorMessage.includes('timeout') || attempt > maxRetries) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  const latencyMs = Date.now() - startTime;

  incrementAiBudget(brandId, aiToolType, campaignId, promptVersion, 0, latencyMs, false).catch(
    (err) => logger.error('[Groq] Failed to log error to budget', { error: err })
  );

  const finalNormalizedError = lastError ? toAppErrorIfRecoverable(lastError as Error) : null;
  if (finalNormalizedError) {
    throw finalNormalizedError;
  }

  throw Errors.INTERNAL_ERROR(`AI call failed after ${attempt} attempts: ${lastError?.message}`);
}

async function incrementAiBudget(
  brandId: string,
  aiToolType: string,
  campaignId: string | null,
  promptVersion: string,
  tokenCount: number,
  latencyMs: number,
  outputSchemaValid: boolean
): Promise<void> {
  await supabase.from('ai_outputs').insert({
    brand_id: brandId,
    campaign_id: campaignId,
    ai_tool_type: aiToolType,
    prompt_version: promptVersion,
    token_count: tokenCount,
    latency_ms: latencyMs,
    output_schema_valid: outputSchemaValid,
  });
}
