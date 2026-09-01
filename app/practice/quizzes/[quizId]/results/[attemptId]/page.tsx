import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getQuizAttemptResults } from "@/lib/actions/practice.actions";
import QuizResults from "@/components/QuizResults";

interface ResultsPageProps {
  params: Promise<{ quizId: string; attemptId: string }>;
}

const ResultsPage = async ({ params }: ResultsPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { quizId, attemptId } = await params;
  const result = await getQuizAttemptResults(attemptId);

  if (!result) redirect(`/practice/quizzes/${quizId}`);

  return (
    <main>
      <QuizResults
        result={result}
        sourceNoteId={result.quiz.source_note_id}
      />
    </main>
  );
};

export default ResultsPage;
