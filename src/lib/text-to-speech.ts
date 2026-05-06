export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

export function speakText(text: string, options?: { lang?: string; rate?: number; pitch?: number }) {
  if (!isSpeechSynthesisSupported()) {
    throw new Error('Text-to-speech is not supported in this browser.');
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang || 'en-US';
  utterance.rate = options?.rate ?? 0.95;
  utterance.pitch = options?.pitch ?? 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
