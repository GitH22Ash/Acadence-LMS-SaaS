"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getNotesStatuses } from "@/lib/actions/learning.actions";

const PENDING_NOTES_KEY = "acadence_pending_notes";

export function getPendingNoteSessions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const val = localStorage.getItem(PENDING_NOTES_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export function addPendingNoteSession(sessionId: string) {
  if (typeof window === "undefined") return;
  const sessions = getPendingNoteSessions();
  if (!sessions.includes(sessionId)) {
    localStorage.setItem(PENDING_NOTES_KEY, JSON.stringify([...sessions, sessionId]));
  }
}

function removePendingNoteSession(sessionId: string) {
  if (typeof window === "undefined") return;
  const sessions = getPendingNoteSessions();
  localStorage.setItem(
    PENDING_NOTES_KEY,
    JSON.stringify(sessions.filter((id) => id !== sessionId))
  );
}

export function NotesToastProvider() {
  const router = useRouter();

  useEffect(() => {
    // Poll every 5 seconds if there are pending notes
    const interval = setInterval(async () => {
      const pendingSessions = getPendingNoteSessions();
      if (pendingSessions.length === 0) return;

      try {
        const statuses = await getNotesStatuses(pendingSessions);
        
        let needsRefresh = false;
        
        for (const session of statuses) {
          if (session.notes_status === "completed") {
            // Show toast!
            toast.success("Your Session Notes have been created.", {
              duration: 5000,
            });
            // Remove from tracking
            removePendingNoteSession(session.id);
            needsRefresh = true;
          } else if (session.notes_status === "failed") {
            // We can silently remove it or handle failures
            removePendingNoteSession(session.id);
            needsRefresh = true;
          }
        }

        if (needsRefresh) {
          router.refresh();
        }
      } catch (error) {
        console.error("Error polling note statuses:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
