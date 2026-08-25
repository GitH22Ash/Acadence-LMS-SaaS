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