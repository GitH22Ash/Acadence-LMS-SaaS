import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import QuizAttempt from "@/components/QuizAttempt";
import { getQuizWithQuestions } from "@/lib/actions/practice.actions";

interface AttemptPageProps {
  params: Promise<{ quizId: string }>;
}

const AttemptPage = async ({ params }: AttemptPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { quizId } = await params;
  const quiz = await getQuizWithQuestions(quizId);

  if (!quiz) redirect("/practice/quizzes");

  const questions = (quiz.quiz_questions as QuizQuestion[]) || [];

  return (
    <main>
      <QuizAttempt
        quiz={{
          id: quiz.id,
          user_id: quiz.user_id,
          title: quiz.title,
          subject: quiz.subject,
          source_note_id: quiz.source_note_id,
          source_session_id: quiz.source_session_id,
          question_count: quiz.question_count,
          created_at: quiz.created_at,
          updated_at: quiz.updated_at,
        }}
        questions={questions}
      />
    </main>
  );
};

export default AttemptPage;
