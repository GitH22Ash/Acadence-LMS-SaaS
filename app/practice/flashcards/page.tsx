import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserDecks } from "@/lib/actions/practice.actions";
import FlashcardDeckCard from "@/components/FlashcardDeckCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";

const FlashcardsPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const decks = await getUserDecks();

  const totalDue = decks.reduce((sum, d) => sum + d.due_count, 0);

  return (
    <main>
      {/* Header */}
      <section className="flex flex-col gap-2">
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back to Practice
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Layers className="size-5 text-primary" strokeWidth={1.8} />
          </div>
          <h1>My Flashcards</h1>
        </div>
        {totalDue > 0 && (
          <p className="text-muted-foreground text-base">
            {totalDue} {totalDue === 1 ? "card" : "cards"} due today
          </p>
        )}
      </section>

      {/* Start review button */}
      {totalDue > 0 && (
        <section>
          <Link
            href="/practice/flashcards/review"
            className="btn-primary py-3 px-6 w-fit"
          >
            Start Review ({totalDue} {totalDue === 1 ? "card" : "cards"})
          </Link>
        </section>
      )}

      {/* Deck grid */}
      {decks.length > 0 ? (
        <section className="companions-grid">
          {decks.map((deck) => (
            <FlashcardDeckCard key={deck.id} deck={deck} />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={
            <Layers
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
            />
          }
          title="No flashcards yet"
          description="Complete a learning session to create your first practice deck."
          actionLabel="Explore Companions"
          actionHref="/companions"
        />
      )}
    </main>
  );
};

export default FlashcardsPage;
