import { getAllCompanions } from "@/lib/actions/companion.actions";
import CompanionCard from "@/components/CompanionCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/SearchInput";
import SubjectFilter from "@/components/SubjectFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const CompanionsLibrary = async ({ searchParams }: SearchParams) => {
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  const companions = await getAllCompanions({ subject, topic });

  return (
    <main>
      <section className="flex justify-between items-center gap-4 max-sm:flex-col max-sm:items-stretch">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <h1>Companion Library</h1>
          <Button asChild variant="default" className="sm:hidden rounded-xl">
            <Link href="/companions/new">
              <Plus className="size-4 mr-2" aria-hidden="true" />
              Create
            </Link>
          </Button>
        </div>
        <div className="flex gap-3 max-sm:flex-col items-center">
          <SearchInput />
          <SubjectFilter />
          <Button asChild variant="default" className="max-sm:hidden rounded-xl">
            <Link href="/companions/new">
              <Plus className="size-4 mr-2" aria-hidden="true" />
              Create Companion
            </Link>
          </Button>
        </div>
      </section>

      {companions.length > 0 ? (
        <section className="companions-grid">
          {companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              {...companion}
              color={getSubjectColor(companion.subject)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No companions found"
          description="Try adjusting your search or create a new companion."
          actionLabel="Create Companion"
          actionHref="/companions/new"
        />
      )}
    </main>
  );
};

export default CompanionsLibrary;