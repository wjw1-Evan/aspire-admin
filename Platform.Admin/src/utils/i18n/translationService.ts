/**
 * 翻译服务 - 调用 OpenAI API 自动翻译缺失的多语言
 */

interface TranslateRequest {
  text: string;
  targetLocale: string;
  sourceText?: string;
}

interface TranslateResponse {
  translatedText: string;
}

const TRANSLATION_PROMPT = `You are a professional translator. Translate the following text to {targetLocale}.
Rules:
1. Keep the same tone and style as the source
2. Preserve any placeholder variables like {0}, {1}, {name}, etc.
3. If it's a UI label, keep it concise
4. Only return the translated text, no explanations

Source text (en-US): {sourceText}
Translation:`;

const LOCALE_DISPLAY_NAMES: Record<string, string> = {
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'de-DE': 'German',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'pt-BR': 'Portuguese (Brazil)',
  'it-IT': 'Italian',
  'ru-RU': 'Russian',
  'ar-EG': 'Arabic',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
  'id-ID': 'Indonesian',
  'bn-BD': 'Bengali',
  'fa-IR': 'Persian',
  'tr-TR': 'Turkish',
};

/**
 * 获取目标语言的人类可读名称
 */
export function getLocaleDisplayName(locale: string): string {
  return LOCALE_DISPLAY_NAMES[locale] || locale;
}

/**
 * 使用 OpenAI API 翻译文本
 */
export async function translateWithOpenAI(
  text: string,
  targetLocale: string,
  sourceText?: string
): Promise<string> {
  const targetName = getLocaleDisplayName(targetLocale);
  const prompt = TRANSLATION_PROMPT
    .replace('{targetLocale}', targetName)
    .replace('{sourceText}', sourceText || text);

  try {
    const response = await fetch('/apiservice/api/xiaoke/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\n"${text}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[i18n] Translation API failed:', response.status);
      return text;
    }

    const data = await response.json();
    const translatedText = data?.data?.content || data?.message || text;

    console.log('[i18n] Translated:', { text, targetLocale, translatedText });
    return translatedText;
  } catch (error) {
    console.error('[i18n] Translation error:', error);
    return text;
  }
}

/**
 * 翻译单个文本
 */
export async function translateText(
  text: string,
  targetLocale: string,
  sourceText?: string
): Promise<string> {
  if (!text || text.trim() === '') {
    return text;
  }

  return translateWithOpenAI(text, targetLocale, sourceText);
}

/**
 * 批量翻译多个文本
 */
export async function translateBatch(
  texts: Array<{ id: string; text: string }>,
  targetLocale: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const { id, text } of texts) {
    try {
      const translated = await translateWithOpenAI(text, targetLocale);
      results.set(id, translated);
    } catch (error) {
      console.error('[i18n] Failed to translate:', id, error);
      results.set(id, text);
    }
  }

  return results;
}