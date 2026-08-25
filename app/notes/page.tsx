import { getUserNotes } from "@/lib/actions/learning.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NoteCard from "@/components/NoteCard";
import NotesSearch from "@/components/NotesSearch";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookOpen, Sparkles } from "lucide-react";

interface NotesPageProps {
  params: Promise<{ [key: string]: string | undefined }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const NotesPage = async ({ searchParams }: NotesPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;

  const notes = await getUserNotes(search);

  return (
    <main>
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="size-5 text-primary" strokeWidth={1.8} />
          </div>
          <h1>My Notes</h1>
        </div>
        <p className="text-muted-foreground text-base">
          Your learning, organized automatically from every voice session.
        </p>
      </section>

      {/* Search + Filters */}
      <section className="flex justify-between items-center gap-4 max-sm:flex-col max-sm:items-stretch">
        <NotesSearch />
      </section>

      {/* Notes Grid */}
      {notes.length > 0 ? (
        <section className="notes-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </section>
      ) : search ? (
        <EmptyState
          title="No notes found"
          description={`No notes matching "${search}". Try a different search term.`}
          icon={<BookOpen className="size-7 text-muted-foreground" strokeWidth={1.5} />}
        />
      ) : (
        <EmptyState
          icon={<Sparkles className="size-7 text-muted-foreground" strokeWidth={1.5} />}
          title="Your learning notes will appear here"
          description="Complete a voice learning session and Acadence will organize what you learned into structured study notes."
          actionLabel="Explore Companions"
          actionHref="/companions"
        />
      )}
    </main>
  );
};

export default NotesPage;
