import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDeckWithCards } from "@/lib/actions/practice.actions";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

interface DeckDetailPageProps {
  params: Promise<{ deckId: string }>;
}

const DeckDetailPage = async ({ params }: DeckDetailPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId);

  if (!deck) redirect("/practice/flashcards");

  const cards = (deck.flashcards as any[]) || [];

  return (
    <main>
      {/* Header */}
      <section className="flex flex-col gap-2">
        <Link
          href="/practice/flashcards"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back to Flashcards
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Layers className="size-5 text-primary" strokeWidth={1.8} />
          </div>
          <h1>{deck.title}</h1>
        </div>
        <p className="text-muted-foreground text-base">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
          {deck.subject && ` · ${deck.subject}`}
        </p>
      </section>

      {/* Start review button */}
      <section>
        <Link
          href={`/practice/flashcards/review?deckId=${deck.id}`}
          className="btn-primary py-3 px-6 w-fit"
        >
          Start Review
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      </section>

      {/* Card preview list */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cards</h2>
        {cards.map((card: any, i: number) => (
          <div
            key={card.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Card {i + 1}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  card.difficulty === "easy"
                    ? "bg-success/10 text-success"
                    : card.difficulty === "hard"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning"
                }`}
              >
                {card.difficulty}
              </span>
            </div>
            <p className="text-sm font-medium">{card.front}</p>
            <p className="text-sm text-muted-foreground">{card.back}</p>
          </div>
        ))}
      </section>
    </main>
  );
};

export default DeckDetailPage;
