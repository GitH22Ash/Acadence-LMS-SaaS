import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPracticeSummary } from "@/lib/actions/practice.actions";
import FlashcardDeckCard from "@/components/FlashcardDeckCard";
import QuizCardComponent from "@/components/QuizCard";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import {
  Layers,
  FileQuestion,
  ArrowRight,
  Sparkles,
  Brain,
} from "lucide-react";

const PracticePage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const summary = await getPracticeSummary();

  const hasContent =
    summary.total_deck_count > 0 || summary.total_quiz_count > 0;

  return (
    <main>
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="size-5 text-primary" strokeWidth={1.8} />
          </div>
          <h1>Practice</h1>
        </div>
        <p className="text-muted-foreground text-base">
          Review what you&apos;ve learned. Build lasting knowledge.
        </p>
      </section>

      {hasContent ? (
        <>
          {/* Today summary */}
          {(summary.due_card_count > 0 || summary.total_quiz_count > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Due cards stat */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-1">
                  <p className="text-3xl font-bold">
                    {summary.due_card_count}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {summary.due_card_count === 1
                      ? "card ready to review"
                      : "cards ready to review"}
                  </p>
                </div>
                {summary.due_card_count > 0 && (
                  <Link
                    href="/practice/flashcards/review"
                    className="btn-primary text-sm py-2.5 px-5"
                  >
                    Start Review
                    <ArrowRight className="size-3.5" strokeWidth={2} />
                  </Link>
                )}
              </div>

              {/* Quizzes stat */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-1">
                  <p className="text-3xl font-bold">
                    {summary.total_quiz_count}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {summary.total_quiz_count === 1
                      ? "quiz available"
                      : "quizzes available"}
                  </p>
                </div>
                {summary.total_quiz_count > 0 && (
                  <Link
                    href="/practice/quizzes"
                    className="btn-primary text-sm py-2.5 px-5"
                  >
                    Take a Quiz
                    <ArrowRight className="size-3.5" strokeWidth={2} />
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Flashcard decks */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-primary" strokeWidth={1.8} />
                <h2>Flashcards</h2>
              </div>
              {summary.total_deck_count > 4 && (
                <Link
                  href="/practice/flashcards"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
            {summary.recent_decks.length > 0 ? (
              <div className="companions-grid">
                {summary.recent_decks.map((deck) => (
                  <FlashcardDeckCard key={deck.id} deck={deck} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={
                  <Layers
                    className="size-7 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                }
                title="No flashcards yet"
                description="Complete a learning session and generate flashcards from your notes."
                actionLabel="Go to My Notes"
                actionHref="/notes"
              />
            )}
          </section>

          {/* Quizzes */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileQuestion
                  className="size-5 text-primary"
                  strokeWidth={1.8}
                />
                <h2>Quizzes</h2>
              </div>
              {summary.total_quiz_count > 4 && (
                <Link
                  href="/practice/quizzes"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
            {summary.recent_quizzes.length > 0 ? (
              <div className="companions-grid">
                {summary.recent_quizzes.map((quiz) => (
                  <QuizCardComponent key={quiz.id} quiz={quiz} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={
                  <FileQuestion
                    className="size-7 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                }
                title="No quizzes yet"
                description="Generate a quiz from your learning notes to test your understanding."
                actionLabel="Go to My Notes"
                actionHref="/notes"
              />
            )}
          </section>
        </>
      ) : (
        <EmptyState
          icon={
            <Sparkles
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          }
          title="Your practice hub will come alive here"
          description="Complete a voice learning session, then generate flashcards and quizzes from your AI notes to start practicing."
          actionLabel="Explore Companions"
          actionHref="/companions"
        />
      )}
    </main>
  );
};

export default PracticePage;
