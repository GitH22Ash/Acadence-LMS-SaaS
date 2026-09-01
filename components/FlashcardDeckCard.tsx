"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layers } from "lucide-react";
import { getSubjectColor } from "@/lib/utils";

interface FlashcardDeckCardProps {
  deck: FlashcardDeckCard;
}

const FlashcardDeckCard = ({ deck }: FlashcardDeckCardProps) => {
  const color = getSubjectColor(deck.subject || "");

  return (
    <article className="companion-card group">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div
          className="subject-badge"
          style={{ backgroundColor: `${color}20` }}
        >
          {deck.subject && (
            <span className="flex items-center gap-1.5">
              <Image
                src={`/icons/${deck.subject}.svg`}
                alt=""
                width={14}
                height={14}
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden
              />
              {deck.subject}
            </span>
          )}
        </div>
        {deck.due_count > 0 && (
          <span className="note-badge generating">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color || "var(--primary)" }}
            />
            {deck.due_count} due
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="text-lg font-bold tracking-tight line-clamp-1">
          {deck.title}
        </h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Layers className="size-3.5" strokeWidth={1.8} />
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-sm text-muted-foreground">
          {new Date(deck.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Link
          href={
            deck.due_count > 0
              ? `/practice/flashcards/review?deckId=${deck.id}`
              : `/practice/flashcards/${deck.id}`
          }
        >
          <span className="btn-primary text-sm py-2 px-4 group-hover:gap-3 transition-all">
            {deck.due_count > 0 ? "Review" : "View"}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        </Link>
      </div>
    </article>
  );
};

export default FlashcardDeckCard;
