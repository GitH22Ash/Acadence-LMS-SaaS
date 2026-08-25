"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Lightbulb,
  List,
  MessageSquareText,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  HelpCircle,
} from "lucide-react";

interface NoteDetailProps {
  note: LearningNoteDetail;
}

const NoteDetail = ({ note }: NoteDetailProps) => {
  const formattedDate = note.session_started_at
    ? new Date(note.session_started_at).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const durationMinutes = note.session_duration_seconds
    ? Math.round(note.session_duration_seconds / 60)
    : null;

  return (
    <div className="note-detail-layout">
      {/* Back navigation */}
      <Link
        href="/notes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        Back to My Notes
      </Link>

      {/* Header */}
      <header className="note-detail-header">
        <h1 className="text-2xl sm:text-3xl">
          {note.title || "Untitled Notes"}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {note.companion_name && (
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4" strokeWidth={1.8} />
              {note.companion_name}
            </span>
          )}
          {note.subject && (
            <span className="note-detail-badge">{note.subject}</span>
          )}
          {formattedDate && <span>{formattedDate}</span>}
          {durationMinutes !== null && durationMinutes > 0 && (
            <span>{durationMinutes} min session</span>
          )}
        </div>
      </header>

      {/* Summary */}
      {note.summary && (
        <section className="note-section">
          <div className="note-section-header">
            <BookOpen className="size-5 text-primary" strokeWidth={1.8} />
            <h2 className="text-xl">Summary</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
            {note.summary}
          </p>
        </section>
      )}

      {/* Key Concepts */}
      {note.key_concepts.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <Lightbulb className="size-5 text-warning" strokeWidth={1.8} />
            <h2 className="text-xl">Key Concepts</h2>
          </div>
          <ul className="note-list">
            {note.key_concepts.map((concept, i) => (
              <li key={i} className="note-list-item">
                <span className="note-list-number">{i + 1}</span>
                {concept}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Important Points */}
      {note.important_points.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <List className="size-5 text-primary" strokeWidth={1.8} />
            <h2 className="text-xl">Important Points</h2>
          </div>
          <ul className="note-list">
            {note.important_points.map((point, i) => (
              <li key={i} className="note-list-item">
                <span className="note-list-bullet" />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Examples */}
      {note.examples.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <MessageSquareText className="size-5 text-success" strokeWidth={1.8} />
            <h2 className="text-xl">Examples</h2>
          </div>
          <ul className="note-list">
            {note.examples.map((example, i) => (
              <li key={i} className="note-list-item note-example">
                {example}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions to Review */}
      {note.questions_to_review.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <HelpCircle className="size-5 text-primary" strokeWidth={1.8} />
            <h2 className="text-xl">Questions to Review</h2>
          </div>
          <ul className="note-list">
            {note.questions_to_review.map((q, i) => (
              <li key={i} className="note-list-item">
                <span className="note-list-bullet question" />
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Misconceptions */}
      {note.misconceptions.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <AlertTriangle className="size-5 text-destructive" strokeWidth={1.8} />
            <h2 className="text-xl">Misconceptions</h2>
          </div>
          <ul className="note-list">
            {note.misconceptions.map((m, i) => (
              <li key={i} className="note-list-item note-misconception">
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Next Steps */}
      {note.next_steps.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <ArrowRight className="size-5 text-success" strokeWidth={1.8} />
            <h2 className="text-xl">Next Steps</h2>
          </div>
          <ul className="note-list">
            {note.next_steps.map((step, i) => (
              <li key={i} className="note-list-item">
                <span className="note-list-number">{i + 1}</span>
                {step}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default NoteDetail;
