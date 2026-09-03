import { getNoteDetail, getSessionDetail, retryNoteGeneration } from "@/lib/actions/learning.actions";
import { getNotesPracticeStatus } from "@/lib/actions/practice.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NoteDetail from "@/components/NoteDetail";

interface NoteDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const NoteDetailPage = async ({ params }: NoteDetailPageProps) => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  // Try to load the note (by note ID or session ID)
  const note = await getNoteDetail(id);

  // If no note found, check if there's a session with pending/generating/failed notes
  if (!note) {
    const session = await getSessionDetail(id);
    if (!session) redirect("/notes");

    // If the note generation completed but no note exists, it was likely deleted
    if (session.notes_status === "completed") {
      redirect("/notes");
    }

    const companion = session.companions as any;

    // Render a status page based on notes_status
    return (
      <main>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
          {session.notes_status === "generating" && (() => {
            // Detect if generating state is stale (>5 min since session ended)
            const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : 0;
            const isStale = endedAt > 0 && (Date.now() - endedAt) > 5 * 60 * 1000;

            return isStale ? (
              <>
                <div className="note-status-icon failed">
                  <span className="text-2xl">⏱️</span>
                </div>
                <h2>Generation appears to have stalled</h2>
                <p className="text-muted-foreground max-w-sm">
                  Your conversation is safely stored. You can try generating notes again.
                </p>
                <form
                  action={async () => {
                    "use server";
                    await retryNoteGeneration(id);
                    redirect(`/notes/${id}`);
                  }}
                >
                  <button type="submit" className="btn-primary mt-2">
                    Retry
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="note-status-icon generating">
                  <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <h2>Generating notes...</h2>
                <p className="text-muted-foreground max-w-sm">
                  Your conversation has been saved. Acadence is organizing what you learned into structured study notes.
                </p>
              </>
            );
          })()}
          {session.notes_status === "failed" && (
            <>
              <div className="note-status-icon failed">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2>Notes couldn&apos;t be generated</h2>
              <p className="text-muted-foreground max-w-sm">
                Your conversation is safely stored. You can try generating notes again.
              </p>
              <form
                action={async () => {
                  "use server";
                  await retryNoteGeneration(id);
                  redirect(`/notes/${id}`);
                }}
              >
                <button type="submit" className="btn-primary mt-2">
                  Try Again
                </button>
              </form>
            </>
          )}
          {session.notes_status === "pending" && (
            <>
              <div className="note-status-icon pending">
                <span className="text-2xl">⏳</span>
              </div>
              <h2>Notes are being prepared</h2>
              <p className="text-muted-foreground max-w-sm">
                Your session with {companion?.name || "your companion"} has been recorded.
                Notes will be generated shortly.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  // Fetch practice status for this note
  const practiceStatus = await getNotesPracticeStatus(note.id);

  return (
    <main>
      <NoteDetail note={note} practiceStatus={practiceStatus} />
    </main>
  );
};

export default NoteDetailPage;
