import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Mic, MicOff, Loader2, Volume2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  completeReadingSession,
  getAssignmentForLearnerParagraph,
  markAssignmentStarted,
  type AssignmentRecord,
} from '../../lib/app-data';
import { cleanWord } from '../../lib/pronunciation';
import { createSpeechRecognizer, isSpeechRecognitionSupported, type SpeechRecognitionLike } from '../../lib/speech-recognition';
import { isSpeechSynthesisSupported, speakText } from '../../lib/text-to-speech';
import { getSupabaseConfigError } from '../../lib/supabase';
import { SetupNotice } from '../components/SetupNotice';

interface WordState {
  word: string;
  status: 'pending' | 'correct' | 'incorrect';
  lastAttempt: 'correct' | 'incorrect' | null;
  showFeedback: boolean;
  attempts: number;
  incorrectAttempts: number;
}

export function ReadingInterface() {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = location.state?.userName || 'Guest';
  const learnerId = location.state?.learnerId as string | undefined;
  const paragraphId = location.state?.paragraphId as string | undefined;
  const paragraphTitleFromState = location.state?.paragraphTitle as string | undefined;

  const [words, setWords] = useState<WordState[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const configError = getSupabaseConfigError();

  const wordsRef = useRef<WordState[]>([]);
  const currentWordIndexRef = useRef(0);
  const scoreRef = useRef(0);
  const attemptsRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pendingSpokenWordsRef = useRef<string[]>([]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    attemptsRef.current = totalAttempts;
  }, [totalAttempts]);

  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    if (!learnerId) {
      setLoading(false);
      setError('Learner not found. Go back and enter your name to start.');
      return;
    }

    if (!paragraphId) {
      setLoading(false);
      setError('No paragraph selected. Go back and choose a paragraph to read.');
      return;
    }

    void loadAssignment();
  }, [configError, learnerId, paragraphId]);

  const progress = words.length > 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }

  function handleExit() {
    stopListening();
    setShowExitConfirm(false);
    navigate('/reading/select', { state: { userName, learnerId } });
  }

  function handlePlayWord(word: string) {
    try {
      const cleaned = cleanWord(word);
      if (!cleaned) {
        return;
      }
      speakText(cleaned, { lang: 'en-US' });
    } catch (ttsError) {
      setError(getErrorMessage(ttsError, 'Unable to play pronunciation audio.'));
    }
  }

  function startListening() {
    if (!speechSupported || isFinishing || loading) {
      return;
    }

    setError('');
    setInterimTranscript('');
    pendingSpokenWordsRef.current = [];

    if (!recognitionRef.current) {
      const recognizer = createSpeechRecognizer({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });

      recognizer.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            const tokens = transcript
              .split(/\s+/)
              .map((token: string) => cleanWord(token))
              .filter(Boolean);
            pendingSpokenWordsRef.current.push(...tokens);
          } else {
            interim += ` ${transcript}`;
          }
        }

        setInterimTranscript(interim.trim());
        void processPendingSpokenWords();
      };

      recognizer.onerror = (event: any) => {
        const message = event?.error ? `Speech recognition error: ${event.error}` : 'Speech recognition error.';
        setError(message);
        stopListening();
      };

      recognizer.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognizer;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (startError) {
      setError(getErrorMessage(startError, 'Unable to start the microphone.'));
      setIsListening(false);
    }
  }

  async function processPendingSpokenWords() {
    if (isFinishing) {
      return;
    }

    while (pendingSpokenWordsRef.current.length > 0) {
      const index = currentWordIndexRef.current;
      const currentWords = wordsRef.current;

      if (index >= currentWords.length) {
        pendingSpokenWordsRef.current = [];
        return;
      }

      const expectedRaw = currentWords[index]?.word || '';
      const expected = cleanWord(expectedRaw);
      const spoken = pendingSpokenWordsRef.current.shift() || '';

      if (!expected) {
        const nextWords = currentWords.map((word, wordIndex) =>
          wordIndex === index
            ? { ...word, status: 'correct' as const, lastAttempt: null, showFeedback: false }
            : word,
        );
        wordsRef.current = nextWords;
        setWords(nextWords);
        currentWordIndexRef.current = index + 1;
        setCurrentWordIndex(index + 1);
        continue;
      }

      const isCorrect = spoken === expected;
      const nextAttempts = attemptsRef.current + 1;
      attemptsRef.current = nextAttempts;
      setTotalAttempts(nextAttempts);

      let nextScore = scoreRef.current;
      if (isCorrect) {
        nextScore += 1;
        scoreRef.current = nextScore;
        setScore(nextScore);
      }

      const nextWords = currentWords.map((word, wordIndex) => {
        if (wordIndex !== index) {
          return word;
        }

        return {
          ...word,
          status: isCorrect ? ('correct' as const) : ('incorrect' as const),
          lastAttempt: isCorrect ? ('correct' as const) : ('incorrect' as const),
          showFeedback: true,
          attempts: word.attempts + 1,
          incorrectAttempts: isCorrect ? word.incorrectAttempts : word.incorrectAttempts + 1,
        };
      });

      wordsRef.current = nextWords;
      setWords(nextWords);

      window.setTimeout(() => {
        setWords((prev) => {
          if (!prev[index]) {
            return prev;
          }
          const cleared = prev.map((word, wordIndex) =>
            wordIndex === index
              ? {
                  ...word,
                  showFeedback: false,
                }
              : word,
          );
          wordsRef.current = cleared;
          return cleared;
        });
      }, 900);

      if (isCorrect) {
        if (index === currentWords.length - 1) {
          pendingSpokenWordsRef.current = [];
          stopListening();
          void finishReading(nextScore, nextWords, nextAttempts);
          return;
        }

        currentWordIndexRef.current = index + 1;
        setCurrentWordIndex(index + 1);
        continue;
      }

      if (index === currentWords.length - 1) {
        pendingSpokenWordsRef.current = [];
        stopListening();
        void finishReading(nextScore, nextWords, nextAttempts);
        return;
      }

      currentWordIndexRef.current = index + 1;
      setCurrentWordIndex(index + 1);
    }
  }

  async function loadAssignment() {
    try {
      setLoading(true);
      setError('');
      const activeAssignment = await getAssignmentForLearnerParagraph(learnerId as string, paragraphId as string);

      setAssignment(activeAssignment);
      const paragraphContent = activeAssignment.paragraph?.content || '';
      if (!paragraphContent) {
        setError('This paragraph could not be loaded. Please go back and choose another paragraph.');
        setWords([]);
        wordsRef.current = [];
        return;
      }

      const wordList = paragraphContent.split(/\s+/).map((word) => ({
        word,
        status: 'pending' as const,
        lastAttempt: null,
        showFeedback: false,
        attempts: 0,
        incorrectAttempts: 0,
      }));
      setWords(wordList);
      wordsRef.current = wordList;
      setCurrentWordIndex(0);
      currentWordIndexRef.current = 0;
      setScore(0);
      scoreRef.current = 0;
      setTotalAttempts(0);
      attemptsRef.current = 0;

      if (activeAssignment.status === 'assigned' || activeAssignment.status === 'completed') {
        await markAssignmentStarted(activeAssignment.id);
        setAssignment({ ...activeAssignment, status: 'in_progress' });
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load the selected paragraph.'));
    } finally {
      setLoading(false);
    }
  }

  async function finishReading(finalScore: number, finalWords: WordState[], finalAttempts: number) {
    if (!assignment?.paragraph || !learnerId) {
      return;
    }

    try {
      setIsFinishing(true);
      const mistakeWords = finalWords
        .filter((word) => word.incorrectAttempts > 0)
        .map((word) => word.word);
      const result = await completeReadingSession({
        learnerId,
        paragraphId: assignment.paragraph_id,
        assignmentId: assignment.id,
        score: finalScore,
        totalWords: finalWords.length,
        totalAttempts: finalAttempts,
        mistakeWords,
      });

      navigate('/results', {
        state: {
          userName,
          learnerId,
          paragraphTitle: assignment.paragraph.title,
          score: finalScore,
          totalWords: finalWords.length,
          accuracy: result.accuracy,
          issueSummaries: result.issueSummaries,
        },
      });
    } catch (finishError) {
      setError(getErrorMessage(finishError, 'Unable to save the reading result.'));
    } finally {
      setIsFinishing(false);
    }
  }

  if (configError) {
    return (
      <div className="p-8">
        <SetupNotice message={configError} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {!speechSupported && (
          <SetupNotice
            title="Speech recognition not supported"
            message="This browser does not support real-time speech recognition. Please use a Chromium-based browser (Chrome/Edge) on desktop."
          />
        )}

        {speechSupported && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
            Read one word at a time.
            <span className="text-gray-500"> Pause briefly after each word and wait until it turns green before continuing.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="text-2xl text-gray-900">Welcome, {userName}!</h2>
              <p className="text-gray-600">
                {assignment?.paragraph?.title
                  ? `Selected paragraph: ${assignment.paragraph.title}`
                  : paragraphTitleFromState
                    ? `Selected paragraph: ${paragraphTitleFromState}`
                    : 'Selected paragraph'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Press Start, then read out loud. Words turn green when matched. If a word is wrong, it turns red and the session moves on.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => (isListening ? stopListening() : startListening())}
                disabled={!speechSupported || loading || isFinishing || words.length === 0}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {isListening ? 'Stop' : 'Start'}
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
              {loading || isFinishing ? (
                <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
              ) : isListening ? (
                <Mic className="w-5 h-5 text-green-600 animate-pulse" />
              ) : (
                <MicOff className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">
                {loading ? 'Loading...' : isFinishing ? 'Saving...' : isListening ? 'Listening...' : 'Ready'}
              </span>
            </div>
            </div>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Progress: {currentWordIndex + 1} / {words.length}</span>
            <span>Score: {score} / {totalAttempts || 1}</span>
          </div>

          {isListening && interimTranscript && (
            <div className="mt-4 text-sm text-gray-600">
              <span className="text-gray-500">Heard:</span> {interimTranscript}
            </div>
          )}

          {isSpeechSynthesisSupported() && words[currentWordIndex]?.lastAttempt === 'incorrect' && (
            <div className="mt-4 text-sm text-gray-700">
              Need help? Tap the speaker icon above the red word to hear a model pronunciation.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading assigned paragraph...</span>
            </div>
          ) : words.length > 0 ? (
            <div className="text-center space-y-4">
              <div className="text-xl leading-relaxed flex flex-wrap gap-1 justify-center">
                {words.map((wordState, index) => (
                  <div key={index} className="relative inline-block">
                    <motion.span
                      className={`
                        px-2 py-1 rounded-lg transition-all select-none
                        ${wordState.status === 'pending' ? 'hover:bg-gray-100' : ''}
                        ${wordState.status === 'correct' ? 'bg-green-100 text-green-700' : ''}
                        ${wordState.status === 'incorrect' ? 'bg-red-100 text-red-700' : ''}
                        ${index === currentWordIndex && wordState.status === 'pending' ? 'ring-2 ring-blue-400' : ''}
                      `}
                      animate={
                        wordState.lastAttempt === 'incorrect' && wordState.showFeedback
                          ? { x: [-5, 5, -5, 5, 0] }
                          : {}
                      }
                      transition={{ duration: 0.4 }}
                    >
                      {wordState.word}
                    </motion.span>

                    {isSpeechSynthesisSupported() && wordState.status === 'incorrect' && (
                      <button
                        type="button"
                        onClick={() => handlePlayWord(wordState.word)}
                        className="absolute left-1/2 -translate-x-1/2 -top-8 p-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                        aria-label="Play pronunciation"
                      >
                        <Volume2 className="w-4 h-4 text-gray-700" />
                      </button>
                    )}

                    <AnimatePresence>
                      {wordState.showFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 0, scale: 0.5 }}
                          animate={{ opacity: 1, y: -30, scale: 1 }}
                          exit={{ opacity: 0, y: -50 }}
                          className={`
                            absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none
                            ${wordState.lastAttempt === 'correct' ? 'text-green-600' : 'text-red-600'}
                          `}
                        >
                          {wordState.lastAttempt === 'correct' ? '+1' : '-1'}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-600">
              No assigned paragraph yet. Ask the admin to assign one, then reload this page.
            </div>
          )}
        </div>
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl text-gray-900">Exit session?</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to exit sessions?
              </p>
            </div>
            <div className="p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
