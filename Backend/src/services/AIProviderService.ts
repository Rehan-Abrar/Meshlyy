import config from '../config/env';
import { AppError, Errors } from '../lib/errors';
import { logger } from '../middleware/logging';
import { callGemini, type GeminiCallOptions, type GeminiCallResult } from './GeminiService';
import { callGroq } from './GroqService';

export type AiProvider = 'gemini' | 'groq';

export interface AIProviderCallOptions extends GeminiCallOptions {
  allowFallback?: boolean;
}

export interface AIProviderCallResult<T = any> extends GeminiCallResult<T> {
  provider: AiProvider;
  fallbackUsed: boolean;
  attemptedProviders: AiProvider[];
}

const FALLBACK_ERROR_CODES = new Set([
  'AI_UNAVAILABLE',
  'AI_RATE_LIMIT',
  'REQUEST_TIMEOUT',
  'INTERNAL_ERROR',
]);

function shouldFallback(error: unknown): boolean {
  if (error instanceof AppError) {
    return FALLBACK_ERROR_CODES.has(error.code);
  }
  return true;
}

function isProviderConfigured(provider: AiProvider): boolean {
  if (provider === 'gemini') {
    return Boolean(config.GEMINI_API_KEY?.trim());
  }

  return Boolean(config.GROQ_API_KEY?.trim());
}

function getProviderOrder(): AiProvider[] {
  const primary: AiProvider = config.AI_PROVIDER === 'groq' ? 'groq' : 'gemini';
  const secondary: AiProvider = primary === 'gemini' ? 'groq' : 'gemini';
  return [primary, secondary];
}

async function callWithProvider<T>(
  provider: AiProvider,
  prompt: string,
  aiToolType: string,
  promptVersion: string,
  brandId: string,
  campaignId: string | null,
  options: GeminiCallOptions
): Promise<GeminiCallResult<T>> {
  if (provider === 'groq') {
    return callGroq<T>(
      prompt,
      aiToolType,
      promptVersion,
      brandId,
      campaignId,
      {
        modelName: options.modelName || config.GROQ_MODEL,
        timeoutMs: options.timeoutMs || config.GROQ_TIMEOUT_MS,
        maxRetries: options.maxRetries,
      }
    );
  }

  return callGemini<T>(
    prompt,
    aiToolType,
    promptVersion,
    brandId,
    campaignId,
    {
      modelName: options.modelName,
      timeoutMs: options.timeoutMs || config.GEMINI_TIMEOUT_MS,
      maxRetries: options.maxRetries,
    }
  );
}

/**
 * Unified AI call with provider routing and automatic fallback.
 */
export async function callAI<T = any>(
  prompt: string,
  aiToolType: string,
  promptVersion: string,
  brandId: string,
  campaignId: string | null,
  options: AIProviderCallOptions = {}
): Promise<AIProviderCallResult<T>> {
  const { allowFallback = true, ...providerOptions } = options;

  const providerOrder = getProviderOrder();
  const providersToTry = allowFallback ? providerOrder : [providerOrder[0]];

  const attemptedProviders: AiProvider[] = [];
  let lastError: unknown = null;

  for (let index = 0; index < providersToTry.length; index++) {
    const provider = providersToTry[index];

    if (!isProviderConfigured(provider)) {
      logger.warn('[AIProvider] Provider skipped because it is not configured', { provider });
      continue;
    }

    attemptedProviders.push(provider);

    try {
      const result = await callWithProvider<T>(
        provider,
        prompt,
        aiToolType,
        promptVersion,
        brandId,
        campaignId,
        providerOptions
      );

      return {
        ...result,
        provider,
        fallbackUsed: attemptedProviders.length > 1,
        attemptedProviders,
      };
    } catch (error) {
      lastError = error;
      const isLastAttempt = index === providersToTry.length - 1;

      if (isLastAttempt || !allowFallback || !shouldFallback(error)) {
        throw error;
      }

      logger.warn('[AIProvider] Primary provider failed, falling back', {
        failedProvider: provider,
        nextProvider: providersToTry[index + 1],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (attemptedProviders.length === 0) {
    throw Errors.AI_UNAVAILABLE();
  }

  if (lastError) {
    throw lastError;
  }

  throw Errors.AI_UNAVAILABLE();
}
