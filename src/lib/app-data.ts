import { buildIssueSummaries } from './pronunciation';
import { requireSupabase } from './supabase';

export interface LearnerRecord {
  id: string;
  full_name: string;
  normalized_name: string;
  created_at: string;
  last_seen_at: string;
}

export interface ParagraphRecord {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRecord {
  id: string;
  learner_id: string;
  paragraph_id: string;
  status: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  learner?: LearnerRecord;
  paragraph?: ParagraphRecord;
}

export interface LearnerParagraphAssignment {
  assignment: AssignmentRecord;
  paragraph: ParagraphRecord;
}

export interface SessionIssueRecord {
  id: string;
  session_id: string;
  issue_key: string;
  issue_label: string;
  issue_count: number;
  affected_words: string[];
  suggestions: string[];
}

export interface ReadingSessionRecord {
  id: string;
  learner_id: string;
  paragraph_id: string;
  assignment_id: string | null;
  score: number;
  total_words: number;
  total_attempts: number;
  accuracy: number;
  completed_at: string;
  learner?: LearnerRecord;
  paragraph?: ParagraphRecord;
  pronunciation_issue_summaries?: SessionIssueRecord[];
}

export interface DashboardStats {
  totalUsers: number;
  activeParagraphs: number;
  avgAccuracy: number;
  sessionsToday: number;
}

export interface DashboardActivity {
  id: string;
  user: string;
  action: string;
  score: string;
  time: string;
}

export function normalizeLearnerName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function registerLearner(fullName: string) {
  const supabase = requireSupabase();
  const trimmedName = fullName.trim();

  const { data, error } = await supabase
    .from('learners')
    .upsert(
      {
        full_name: trimmedName,
        normalized_name: normalizeLearnerName(trimmedName),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'normalized_name' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const learner = data as LearnerRecord;
  await ensureLearnerAssignments(learner.id);
  return learner;
}

export async function getLearners() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .order('last_seen_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as LearnerRecord[];
}

export async function ensureLearnerAssignments(learnerId: string) {
  const supabase = requireSupabase();

  const [{ data: paragraphs, error: paragraphsError }, { data: existing, error: existingError }] =
    await Promise.all([
      supabase.from('paragraphs').select('id'),
      supabase.from('paragraph_assignments').select('paragraph_id').eq('learner_id', learnerId),
    ]);

  if (paragraphsError || existingError) {
    throw paragraphsError || existingError;
  }

  const existingSet = new Set((existing || []).map((row) => row.paragraph_id as string));
  const missingParagraphIds = (paragraphs || [])
    .map((row) => row.id as string)
    .filter((paragraphId) => !existingSet.has(paragraphId));

  if (missingParagraphIds.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('paragraph_assignments').insert(
    missingParagraphIds.map((paragraphId) => ({
      learner_id: learnerId,
      paragraph_id: paragraphId,
      status: 'assigned',
      assigned_at: now,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

export async function ensureParagraphAssignments(paragraphId: string) {
  const supabase = requireSupabase();

  const { data: learners, error } = await supabase.from('learners').select('id');
  if (error) {
    throw error;
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('paragraph_assignments').upsert(
    (learners || []).map((learner) => ({
      learner_id: learner.id,
      paragraph_id: paragraphId,
      status: 'assigned',
      assigned_at: now,
    })),
    { onConflict: 'learner_id,paragraph_id' },
  );

  if (insertError) {
    throw insertError;
  }
}

export async function getParagraphs() {
  const supabase = requireSupabase();

  const [{ data: paragraphs, error: paragraphError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase.from('paragraphs').select('*').order('created_at', { ascending: false }),
      supabase
        .from('paragraph_assignments')
        .select('paragraph_id, status')
        .in('status', ['assigned', 'in_progress']),
    ]);

  if (paragraphError) {
    throw paragraphError;
  }

  if (assignmentError) {
    throw assignmentError;
  }

  const assignmentCountByParagraph = (assignments || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.paragraph_id] = (acc[item.paragraph_id] || 0) + 1;
    return acc;
  }, {});

  return ((paragraphs || []) as ParagraphRecord[]).map((paragraph) => ({
    ...paragraph,
    assignedUsers: assignmentCountByParagraph[paragraph.id] || 0,
  }));
}

export async function saveParagraph(input: { id?: string; title: string; content: string }) {
  const supabase = requireSupabase();
  const payload = {
    title: input.title.trim(),
    content: input.content.trim(),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from('paragraphs').update(payload).eq('id', input.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { data, error } = await supabase.from('paragraphs').insert(payload).select('id').single();
  if (error) {
    throw error;
  }

  await ensureParagraphAssignments(data.id as string);
}

export async function deleteParagraph(paragraphId: string) {
  const supabase = requireSupabase();

  const { error } = await supabase.from('paragraphs').delete().eq('id', paragraphId);

  if (error) {
    throw error;
  }
}

export async function getActiveAssignmentForLearner(learnerId: string) {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('paragraph_assignments')
    .select('*, paragraph:paragraphs(*), learner:learners(*)')
    .eq('learner_id', learnerId)
    .in('status', ['assigned', 'in_progress'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AssignmentRecord | null) || null;
}

export async function getAssignmentsForLearner(learnerId: string) {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('paragraph_assignments')
    .select('*, paragraph:paragraphs(*)')
    .eq('learner_id', learnerId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as Array<AssignmentRecord & { paragraph: ParagraphRecord }>;
}

export async function getAssignmentForLearnerParagraph(learnerId: string, paragraphId: string) {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('paragraph_assignments')
    .select('*, paragraph:paragraphs(*), learner:learners(*)')
    .eq('learner_id', learnerId)
    .eq('paragraph_id', paragraphId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as AssignmentRecord;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('paragraph_assignments')
    .insert({
      learner_id: learnerId,
      paragraph_id: paragraphId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .select('*, paragraph:paragraphs(*), learner:learners(*)')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as AssignmentRecord;
}

export async function assignParagraphToLearner(learnerId: string, paragraphId: string) {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('paragraph_assignments')
    .upsert(
      {
        learner_id: learnerId,
        paragraph_id: paragraphId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
      },
      { onConflict: 'learner_id,paragraph_id' },
    )
    .select('*, paragraph:paragraphs(*), learner:learners(*)')
    .single();

  if (error) {
    throw error;
  }

  return data as AssignmentRecord;
}

export async function assignParagraphsToLearner(learnerId: string, paragraphIds: string[]) {
  const supabase = requireSupabase();
  const now = new Date().toISOString();

  const { error } = await supabase.from('paragraph_assignments').upsert(
    paragraphIds.map((paragraphId) => ({
      learner_id: learnerId,
      paragraph_id: paragraphId,
      status: 'assigned',
      assigned_at: now,
      started_at: null,
      completed_at: null,
    })),
    { onConflict: 'learner_id,paragraph_id' },
  );

  if (error) {
    throw error;
  }
}

export async function markAssignmentStarted(assignmentId: string) {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from('paragraph_assignments')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) {
    throw error;
  }
}

export async function completeReadingSession(params: {
  learnerId: string;
  paragraphId: string;
  assignmentId?: string | null;
  score: number;
  totalWords: number;
  totalAttempts: number;
  mistakeWords: string[];
}) {
  const supabase = requireSupabase();
  const accuracy = params.totalWords > 0 ? Math.round((params.score / params.totalWords) * 100) : 0;

  const { data: session, error: sessionError } = await supabase
    .from('reading_sessions')
    .insert({
      learner_id: params.learnerId,
      paragraph_id: params.paragraphId,
      assignment_id: params.assignmentId || null,
      score: params.score,
      total_words: params.totalWords,
      total_attempts: params.totalAttempts,
      accuracy,
      completed_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (sessionError) {
    throw sessionError;
  }

  const issueSummaries = buildIssueSummaries(params.mistakeWords);

  if (issueSummaries.length > 0) {
    const { error: issueError } = await supabase.from('pronunciation_issue_summaries').insert(
      issueSummaries.map((summary) => ({
        session_id: session.id,
        issue_key: summary.issueKey,
        issue_label: summary.issueLabel,
        issue_count: summary.affectedWords.length,
        affected_words: summary.affectedWords,
        suggestions: summary.suggestions,
      })),
    );

    if (issueError) {
      throw issueError;
    }
  }

  if (params.assignmentId) {
    const { error: assignmentError } = await supabase
      .from('paragraph_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.assignmentId);

    if (assignmentError) {
      throw assignmentError;
    }
  }

  return {
    sessionId: session.id as string,
    accuracy,
    issueSummaries,
  };
}

export async function getDashboardData() {
  const supabase = requireSupabase();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers, error: usersError },
    { count: activeParagraphs, error: paragraphsError },
    { data: sessions, error: sessionsError },
    { data: recentSessions, error: recentError },
    learnersResponse,
  ] = await Promise.all([
    supabase.from('learners').select('*', { count: 'exact', head: true }),
    supabase.from('paragraphs').select('*', { count: 'exact', head: true }),
    supabase
      .from('reading_sessions')
      .select('accuracy, completed_at')
      .gte('completed_at', startOfToday.toISOString()),
    supabase
      .from('reading_sessions')
      .select('id, accuracy, completed_at, learner:learners(full_name)')
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase.from('learners').select('*').order('last_seen_at', { ascending: false }).limit(20),
  ]);

  if (usersError || paragraphsError || sessionsError || recentError || learnersResponse.error) {
    throw usersError || paragraphsError || sessionsError || recentError || learnersResponse.error;
  }

  const allAccuracySessions = sessions || [];
  const avgAccuracy = allAccuracySessions.length
    ? Math.round(
        allAccuracySessions.reduce((sum, item) => sum + (item.accuracy || 0), 0) / allAccuracySessions.length,
      )
    : 0;

  const recentActivity = (recentSessions || []).map((session: any) => ({
    id: session.id as string,
    user: session.learner?.full_name || 'Unknown learner',
    action: 'Completed reading session',
    score: `${session.accuracy}%`,
    time: formatRelativeTime(session.completed_at as string),
  }));

  return {
    stats: {
      totalUsers: totalUsers || 0,
      activeParagraphs: activeParagraphs || 0,
      avgAccuracy,
      sessionsToday: (sessions || []).length,
    } satisfies DashboardStats,
    recentActivity,
    learners: (learnersResponse.data || []) as LearnerRecord[],
  };
}

export async function getUserResultsData() {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('reading_sessions')
    .select('*, learner:learners(*), paragraph:paragraphs(*), pronunciation_issue_summaries(*)')
    .order('completed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as ReadingSessionRecord[];
}

export async function getAnalyticsData() {
  const supabase = requireSupabase();

  const [{ data: sessions, error: sessionError }, { data: issues, error: issueError }] = await Promise.all([
    supabase.from('reading_sessions').select('learner_id, accuracy, completed_at'),
    supabase.from('pronunciation_issue_summaries').select('issue_key, issue_label, issue_count'),
  ]);

  if (sessionError || issueError) {
    throw sessionError || issueError;
  }

  return {
    sessions: sessions || [],
    issues: issues || [],
  };
}

export async function verifyAdminPassword(password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('verify_admin_password', { p_password: password });
  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function setAdminPassword(currentPassword: string, nextPassword: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('set_admin_password', {
    p_current: currentPassword,
    p_new: nextPassword,
  });
  if (error) {
    throw error;
  }

  return Boolean(data);
}

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
