export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const anyWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function createSpeechRecognizer(options?: {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
}) {
  const Recognition = getSpeechRecognitionConstructor();
  if (!Recognition) {
    throw new Error('Speech recognition is not supported in this browser.');
  }

  const recognizer = new Recognition();
  recognizer.lang = options?.lang || 'en-US';
  recognizer.interimResults = options?.interimResults ?? true;
  recognizer.continuous = options?.continuous ?? true;
  return recognizer;
}
