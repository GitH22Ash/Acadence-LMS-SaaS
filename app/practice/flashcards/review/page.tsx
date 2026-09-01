import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDueCards, getDeckWithCards } from "@/lib/actions/practice.actions";
import FlashcardReview from "@/components/FlashcardReview";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckCircle2 } from "lucide-react";

interface ReviewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FlashcardReviewPage = async ({ searchParams }: ReviewPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const deckId = typeof params.deckId === "string" ? params.deckId : undefined;

  const dueCards = await getDueCards(deckId);

  // Get deck title if reviewing a specific deck
  let deckTitle: string | undefined;
  if (deckId) {
    const deck = await getDeckWithCards(deckId);
    deckTitle = deck?.title;
  }

  if (dueCards.length === 0) {
    return (
      <main>
        <EmptyState
          icon={
            <CheckCircle2
              className="size-7 text-success"
              strokeWidth={1.5}
            />
          }
          title="All caught up!"
          description="No cards due for review right now. Check back later."
          actionLabel="Back to Practice"
          actionHref="/practice"
        />
      </main>
    );
  }

  return (
    <main>
      <FlashcardReview cards={dueCards} deckTitle={deckTitle} />
    </main>
  );
};

export default FlashcardReviewPage;
