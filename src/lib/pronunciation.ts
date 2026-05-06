export interface IssueTemplate {
  key: string;
  label: string;
  suggestions: string[];
}

export interface IssueSummaryInput {
  issueKey: string;
  issueLabel: string;
  affectedWords: string[];
  suggestions: string[];
}

export const ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    key: 'pb',
    label: 'P and B issue',
    suggestions: [
      'Practice minimal pairs like "pat" and "bat".',
      'Use your hand to feel the puff of air on P.',
      'Repeat short words slowly, then at normal speed.',
    ],
  },
  {
    key: 'ths',
    label: 'TH and S issue',
    suggestions: [
      'Place your tongue gently between your teeth for TH.',
      'Practice "think" versus "sink" in short sets.',
      'Say TH words slowly before reading full sentences.',
    ],
  },
  {
    key: 'vw',
    label: 'V and W issue',
    suggestions: [
      'Touch your top teeth to your lower lip for V.',
      'Round your lips without touching your teeth for W.',
      'Practice pairs like "vest" and "west".',
    ],
  },
  {
    key: 'rl',
    label: 'R and L issue',
    suggestions: [
      'Lift your tongue without touching the roof for R.',
      'Touch the ridge behind your teeth for L.',
      'Practice words like "right", "light", "road", and "load".',
    ],
  },
  {
    key: 'general',
    label: 'General pronunciation issue',
    suggestions: [
      'Slow down and break the sentence into smaller chunks.',
      'Repeat the word three times before moving on.',
      'Listen to a clear model pronunciation and imitate it.',
    ],
  },
];

const ISSUE_MAP = new Map(ISSUE_TEMPLATES.map((template) => [template.key, template]));

export function cleanWord(word: string) {
  return word.replace(/[^a-zA-Z']/g, '').toLowerCase();
}

export function getIssueForWord(word: string) {
  const normalized = cleanWord(word);

  if (!normalized) {
    return ISSUE_MAP.get('general')!;
  }

  if (normalized.includes('th')) {
    return ISSUE_MAP.get('ths')!;
  }

  if (normalized.startsWith('p') || normalized.startsWith('b')) {
    return ISSUE_MAP.get('pb')!;
  }

  if (normalized.startsWith('v') || normalized.startsWith('w')) {
    return ISSUE_MAP.get('vw')!;
  }

  if (normalized.startsWith('r') || normalized.startsWith('l')) {
    return ISSUE_MAP.get('rl')!;
  }

  return ISSUE_MAP.get('general')!;
}

export function buildIssueSummaries(mistakeWords: string[]) {
  const grouped = new Map<string, IssueSummaryInput>();

  mistakeWords.forEach((word) => {
    const issue = getIssueForWord(word);
    const existing = grouped.get(issue.key);

    if (existing) {
      if (!existing.affectedWords.includes(word)) {
        existing.affectedWords.push(word);
      }
      return;
    }

    grouped.set(issue.key, {
      issueKey: issue.key,
      issueLabel: issue.label,
      affectedWords: [word],
      suggestions: issue.suggestions,
    });
  });

  return Array.from(grouped.values());
}
