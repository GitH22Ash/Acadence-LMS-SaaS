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

  let dueCards;
  let deckTitle: string | undefined;

  if (deckId) {
    const { getDueCards } = await import("@/lib/actions/practice.actions");
    dueCards = await getDueCards(deckId);
    const { getDeckWithCards } = await import("@/lib/actions/practice.actions");
    const deck = await getDeckWithCards(deckId);
    deckTitle = deck?.title;
  } else {
    const { getSmartReviewCards } = await import("@/lib/actions/smart-practice.actions");
    dueCards = await getSmartReviewCards();
    deckTitle = "Smart Review";
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
