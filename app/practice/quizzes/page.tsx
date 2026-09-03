import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserQuizzes } from "@/lib/actions/practice.actions";
import QuizCardComponent from "@/components/QuizCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import GenerateSmartQuizButton from "@/components/GenerateSmartQuizButton";
import AdaptiveQuizStarter from "@/components/AdaptiveQuizStarter";
import { Suspense } from "react";

const QuizzesPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const quizzes = await getUserQuizzes();

  return (
    <main>
      <Suspense>
        <AdaptiveQuizStarter />
      </Suspense>
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Back to Practice
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <FileQuestion
                className="size-5 text-primary"
                strokeWidth={1.8}
              />
            </div>
            <h1>My Quizzes</h1>
          </div>
          <p className="text-muted-foreground text-base">
            Test what you actually understand.
          </p>
        </div>
        <GenerateSmartQuizButton />
      </section>

      {/* Quiz grid */}
      {quizzes.length > 0 ? (
        <section className="companions-grid">
          {quizzes.map((quiz) => (
            <QuizCardComponent key={quiz.id} quiz={quiz} />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={
            <FileQuestion
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          }
          title="No quizzes yet"
          description="Complete a learning session to generate your first quiz."
          actionLabel="Explore Companions"
          actionHref="/companions"
        />
      )}
    </main>
  );
};

export default QuizzesPage;
