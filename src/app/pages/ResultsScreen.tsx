import { useLocation, useNavigate } from 'react-router';
import { Trophy, Target, TrendingUp, CheckCircle, XCircle, Home } from 'lucide-react';
import { motion } from 'motion/react';
import type { IssueSummaryInput } from '../../lib/pronunciation';

export function ResultsScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    userName = 'Guest',
    learnerId,
    paragraphTitle = 'Assigned paragraph',
    score = 0,
    totalWords = 0,
    accuracy: accuracyFromState,
    issueSummaries = [],
  } = location.state || {};

  const accuracy = accuracyFromState ?? (totalWords > 0 ? Math.round((score / totalWords) * 100) : 0);
  const normalizedIssueSummaries = issueSummaries as IssueSummaryInput[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full"
            >
              <Trophy className="w-10 h-10 text-green-600" />
            </motion.div>

            <h1 className="text-3xl text-gray-900">Great job, {userName}!</h1>
            <p className="text-gray-600">Here&apos;s your pronunciation report for {paragraphTitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center"
            >
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl text-green-700 mb-1">{score}</div>
              <div className="text-sm text-gray-600">Total Score</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center"
            >
              <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl text-blue-700 mb-1">{accuracy}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center"
            >
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl text-purple-700 mb-1">{totalWords}</div>
              <div className="text-sm text-gray-600">Words Read</div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl text-gray-900 mb-6">Pronunciation Insights</h2>

          <div className="space-y-6">
            {normalizedIssueSummaries.length > 0 ? normalizedIssueSummaries.map((issue, index) => (
              <motion.div
                key={`${issue.issueKey}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="border border-gray-200 rounded-xl p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900">{issue.issueLabel}</h3>
                    <p className="text-sm text-gray-600">Areas for improvement</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5 ml-11">
                  {issue.affectedWords.map((word) => (
                    <span key={word} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm">
                      {word}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 ml-11">
                  {issue.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-gray-600">{idx + 1}</span>
                      </div>
                      <p className="text-gray-700 flex-1">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="border border-gray-200 rounded-xl p-6 text-gray-700"
              >
                No major pronunciation issues were detected in this session.
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex gap-4"
        >
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          <button
            onClick={() => navigate('/reading/select', { state: { userName, learnerId } })}
            className="flex-1 px-6 py-3 bg-white text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-all flex items-center justify-center gap-2"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    </div>
  );
}
