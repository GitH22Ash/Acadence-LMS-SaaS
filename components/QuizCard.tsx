"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileQuestion } from "lucide-react";
import { getSubjectColor } from "@/lib/utils";

interface QuizCardComponentProps {
  quiz: QuizCard;
}

const QuizCardComponent = ({ quiz }: QuizCardComponentProps) => {
  const color = getSubjectColor(quiz.subject || "");
  const hasAttempts = quiz.attempt_count > 0;

  return (
    <article className="companion-card group">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div
          className="subject-badge"
          style={{ backgroundColor: `${color}20` }}
        >
          {quiz.subject && (
            <span className="flex items-center gap-1.5">
              <Image
                src={`/icons/${quiz.subject}.svg`}
                alt=""
                width={14}
                height={14}
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden
              />
              {quiz.subject}
            </span>
          )}
        </div>
        {hasAttempts && quiz.last_score !== null && quiz.last_total !== null && (
          <span className="note-badge completed">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color || "var(--success)" }}
            />
            {Math.round((quiz.last_score / quiz.last_total) * 100)}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="text-lg font-bold tracking-tight line-clamp-1">
          {quiz.title}
        </h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <FileQuestion className="size-3.5" strokeWidth={1.8} />
          {quiz.question_count}{" "}
          {quiz.question_count === 1 ? "question" : "questions"}
          {hasAttempts && (
            <span className="text-muted-foreground/70">
              · {quiz.attempt_count}{" "}
              {quiz.attempt_count === 1 ? "attempt" : "attempts"}
            </span>
          )}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground">
          {new Date(quiz.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Link href={`/practice/quizzes/${quiz.id}`}>
          <span className="btn-primary text-sm py-2 px-4 group-hover:gap-3 transition-all">
            {hasAttempts ? "Retake" : "Take Quiz"}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        </Link>
      </div>
    </article>
  );
};

export default QuizCardComponent;
