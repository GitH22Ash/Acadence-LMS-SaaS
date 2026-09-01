enum Subject {
  maths = "maths",
  language = "language",
  science = "science",
  history = "history",
  coding = "coding",
  geography = "geography",
  economics = "economics",
  finance = "finance",
  business = "business",
}

interface Companion {
  id: string;
  name: string;
  subject: Subject;
  topic: string;
  duration: number;
  bookmarked: boolean;
  voice: string;
  style: string;
  author: string;
  created_at?: string;
}

interface CreateCompanion {
  name: string;
  subject: string;
  topic: string;
  voice: string;
  style: string;
  duration: number;
}

interface GetAllCompanions {
  limit?: number;
  page?: number;
  subject?: string | string[];
  topic?: string | string[];
}

interface SearchParams {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface CompanionComponentProps {
  companionId: string;
  subject: string;
  topic: string;
  name: string;
  userName: string;
  userImage: string;
  voice: string;
  style: string;
}

// === Learning Memory Types ===

interface LearningSession {
  id: string;
  user_id: string;
  companion_id: string;
  vapi_call_id: string | null;
  title: string | null;
  subject: string;
  topic: string | null;
  status: "active" | "completed" | "failed";
  notes_status: "pending" | "generating" | "completed" | "failed";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface ConversationMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sequence_number: number;
  message_timestamp: string | null;
  created_at: string;
}

interface LearningNote {
  id: string;
  session_id: string;
  user_id: string;
  title: string | null;
  subject: string | null;
  summary: string | null;
  key_concepts: string[];
  important_points: string[];
  examples: string[];
  questions_to_review: string[];
  misconceptions: string[];
  next_steps: string[];
  model_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight subset of LearningNote for card rendering on the /notes list page */
interface LearningNoteCard {
  id: string;
  session_id: string;
  title: string | null;
  subject: string | null;
  summary: string | null;
  key_concepts: string[];
  created_at: string;
  // Joined from learning_sessions → companions
  companion_name: string | null;
  notes_status: "pending" | "generating" | "completed" | "failed";
}

/** Full note detail including session context */
interface LearningNoteDetail extends LearningNote {
  companion_name: string | null;
  companion_subject: string | null;
  session_started_at: string | null;
  session_duration_seconds: number | null;
  session_status: string | null;
}

// === Practice Types (Flashcards + Quizzes) ===

interface FlashcardDeck {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  source_note_id: string | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  difficulty: "easy" | "medium" | "hard";
  source_note_id: string | null;
  created_at: string;
  updated_at: string;
}

interface FlashcardReview {
  id: string;
  flashcard_id: string;
  user_id: string;
  rating: "again" | "hard" | "good" | "easy";
  reviewed_at: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

/** Lightweight deck info for list views */
interface FlashcardDeckCard {
  id: string;
  title: string;
  subject: string | null;
  source_note_id: string | null;
  card_count: number;
  due_count: number;
  created_at: string;
}

/** Card with its latest review state for review sessions */
interface FlashcardWithReview extends Flashcard {
  latest_review: FlashcardReview | null;
}

interface Quiz {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  source_note_id: string | null;
  source_session_id: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: "multiple_choice" | "true_false";
  options: string[];
  correct_answer: string;
  explanation: string | null;
  difficulty: "easy" | "medium" | "hard";
  position: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number | null;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  weak_topics: string[];
}

interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  created_at: string;
}

/** Quiz card for list views */
interface QuizCard {
  id: string;
  title: string;
  subject: string | null;
  source_note_id: string | null;
  question_count: number;
  last_score: number | null;
  last_total: number | null;
  attempt_count: number;
  created_at: string;
}

/** Full quiz attempt result with per-question breakdown */
interface QuizAttemptResult {
  attempt: QuizAttempt;
  quiz: Quiz;
  answers: (QuizAnswer & { question: QuizQuestion })[];
}

/** Summary data for the Practice hub */
interface PracticeSummary {
  due_card_count: number;
  total_deck_count: number;
  total_quiz_count: number;
  recent_decks: FlashcardDeckCard[];
  recent_quizzes: QuizCard[];
}