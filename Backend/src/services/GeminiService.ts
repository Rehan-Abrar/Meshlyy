// Shared Gemini API client with timeout, logging, and budget tracking
// Uses direct HTTP calls to Gemini REST API (v1beta) per gemini-request.md reference
import config from '../config/env';
import { logger } from '../middleware/logging';
import { supabase } from '../config/supabase';
import { AppError, Errors } from '../lib/errors';

export interface GeminiCallOptions {
  modelName?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GeminiCallResult<T = any> {
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
    return new AppError(429, 'AI_RATE_LIMIT', 'Gemini quota exceeded. Please try again later.');
  }

  if (
    message.includes('permission denied') ||
    message.includes('forbidden') ||
    message.includes('api key')
  ) {
    return Errors.AI_UNAVAILABLE();
  }

  return null;
}

/**
 * Normalize Gemini text output into parseable JSON.
 * Handles common markdown wrappers like ```json ... ```.
 */
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

function parseGeminiJson<T>(rawText: string): T {
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

  // Final recovery pass: remove trailing commas.
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

  throw lastParseError || new Error('Failed to parse Gemini JSON response');
}

/**
 * Call Gemini API with structured output, timeout, and telemetry
 * 
 * @param prompt - The prompt to send
 * @param aiToolType - Tool type for logging (brief, strategy, fit_score, content_brief)
 * @param promptVersion - Version string (e.g., "strategy-v1.0.0")
 * @param brandId - Brand ID for budget tracking
 * @param campaignId - Optional campaign ID for logging
 * @param options - Optional configuration
 * @returns Parsed output with telemetry
 */
export async function callGemini<T = any>(
  prompt: string,
  aiToolType: string,
  promptVersion: string,
  brandId: string,
  campaignId: string | null,
  options: GeminiCallOptions = {}
): Promise<GeminiCallResult<T>> {
  const {
    modelName = config.GEMINI_MODEL,
    timeoutMs = config.GEMINI_TIMEOUT_MS,
    maxRetries = 1,
  } = options;

  const startTime = Date.now();
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      // Build Gemini REST API endpoint (v1beta)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

      // Build request body per Gemini API spec
      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        }
      };

      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      // Make HTTP POST request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Check HTTP status
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Gemini] HTTP error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200),
        });

        if (response.status === 429) {
          throw new AppError(429, 'AI_RATE_LIMIT', 'Gemini quota exceeded. Please try again later.');
        } else if (response.status === 403) {
          throw Errors.AI_UNAVAILABLE();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Parse response
      const data = await response.json();

      // Extract text from Gemini response structure
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        logger.error('[Gemini] Unexpected response structure', {
          data: JSON.stringify(data).substring(0, 200),
        });
        throw Errors.INTERNAL_ERROR('AI returned unexpected response structure');
      }

      const text = data.candidates[0].content.parts[0].text;

      // Parse JSON response
      let parsedOutput: T;
      try {
        parsedOutput = parseGeminiJson<T>(text);
      } catch (parseError) {
        logger.error('[Gemini] Failed to parse JSON response', {
          aiToolType,
          promptVersion,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          text: text.substring(0, 200),
        });
        throw Errors.INTERNAL_ERROR('AI returned invalid JSON');
      }

      // Calculate metrics
      const latencyMs = Date.now() - startTime;
      const tokenCount = data.usageMetadata?.totalTokenCount || 0;

      // Log successful call
      logger.info('[Gemini] API call succeeded', {
        aiToolType,
        promptVersion,
        latencyMs,
        tokenCount,
        attempt,
        model: modelName,
      });

      // Increment budget asynchronously (don't await)
      incrementAiBudget(brandId, aiToolType, campaignId, promptVersion, tokenCount, latencyMs, true).catch(
        (err) => logger.error('[Gemini] Failed to increment budget', { error: err })
      );

      return {
        output: parsedOutput,
        tokenCount,
        latencyMs,
      };
    } catch (error: any) {
      lastError = error;
      
      // Handle abort/timeout
      if (error.name === 'AbortError') {
        lastError = new Error('Gemini API timeout');
      }

      // Normalize provider messages that do not come through HTTP status checks.
      const normalizedError = toAppErrorIfRecoverable(lastError as Error);
      if (normalizedError) {
        throw normalizedError;
      }

      const errorMessage = lastError?.message ?? 'Unknown Gemini error';

      logger.error('[Gemini] API call failed', {
        aiToolType,
        promptVersion,
        attempt,
        error: errorMessage,
      });

      // Surface handled application errors as-is (no retry wrapping).
      if (lastError instanceof AppError) {
        throw lastError;
      }

      // Don't retry on timeout or last attempt
      if (errorMessage.includes('timeout') || attempt > maxRetries) {
        break;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  // All attempts failed
  const latencyMs = Date.now() - startTime;

  // Log failed call
  incrementAiBudget(brandId, aiToolType, campaignId, promptVersion, 0, latencyMs, false).catch(
    (err) => logger.error('[Gemini] Failed to log error to budget', { error: err })
  );

  const finalNormalizedError = lastError ? toAppErrorIfRecoverable(lastError as Error) : null;
  if (finalNormalizedError) {
    throw finalNormalizedError;
  }

  throw Errors.INTERNAL_ERROR(`AI call failed after ${attempt} attempts: ${lastError?.message}`);
}

/**
 * Increment AI budget tracking in ai_outputs table
 */
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
