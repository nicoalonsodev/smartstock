const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

const GEMINI_TIMEOUT_MS = 120_000;

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: { code?: number; message?: string; status?: string };
}

function parseGeminiErrorPayload(text: string): string | null {
  try {
    const j = JSON.parse(text) as { error?: { message?: string; status?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    /* ignore */
  }
  return null;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly code: 'config' | 'api_key' | 'timeout' | 'http' | 'empty' | 'parse',
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export async function llamarGemini(
  prompt: string,
  archivo: { base64: string; mimeType: string },
): Promise<string> {
  return llamarGeminiBase([
    { inline_data: { mime_type: archivo.mimeType, data: archivo.base64 } },
    { text: prompt },
  ]);
}

/**
 * Variant that sends only text (no file). Used for matching, summaries, etc.
 */
export async function llamarGeminiTexto(prompt: string): Promise<string> {
  return llamarGeminiBase([{ text: prompt }]);
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function llamarGeminiBase(parts: GeminiPart[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new GeminiError('GEMINI_API_KEY no configurada', 'config');
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GeminiError(
        'Tiempo de espera agotado al llamar a Gemini. Intentá con un archivo más liviano.',
        'timeout',
      );
    }
    throw new GeminiError((e as Error).message, 'http');
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();

  if (!response.ok) {
    const parsed = parseGeminiErrorPayload(rawText);
    const msg = parsed ?? rawText.slice(0, 500);

    if (response.status === 400 && /API key/i.test(msg)) {
      throw new GeminiError('API key de Gemini inválida o rechazada.', 'api_key');
    }
    if (response.status === 403 || response.status === 401) {
      throw new GeminiError('No autorizado ante la API de Gemini (revisá la API key).', 'api_key');
    }

    throw new GeminiError(`Gemini API error ${response.status}: ${msg}`, 'http');
  }

  let data: GeminiResponse;
  try {
    data = JSON.parse(rawText) as GeminiResponse;
  } catch {
    throw new GeminiError('Respuesta de Gemini no es JSON válido', 'parse');
  }

  if (data.error?.message) {
    throw new GeminiError(data.error.message, 'api_key');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new GeminiError('Gemini no devolvió contenido', 'empty');
  }

  return text;
}
