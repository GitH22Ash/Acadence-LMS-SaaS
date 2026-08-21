import { getAllCompanions } from "@/lib/actions/companion.actions";
import CompanionCard from "@/components/CompanionCard";
import { getSubjectColor } from "@/lib/utils";
import SearchInput from "@/components/SearchInput";
import SubjectFilter from "@/components/SubjectFilter";
import { EmptyState } from "@/components/shared/EmptyState";

const CompanionsLibrary = async ({ searchParams }: SearchParams) => {
  const filters = await searchParams;
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";

  const companions = await getAllCompanions({ subject, topic });

  return (
    <main>
      <section className="flex justify-between items-center gap-4 max-sm:flex-col max-sm:items-stretch">
        <h1>Companion Library</h1>
        <div className="flex gap-3 max-sm:flex-col">
          <SearchInput />
          <SubjectFilter />
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