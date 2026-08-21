export const dynamic = "force-dynamic";

import CompanionCard from "@/components/CompanionCard";
import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
<<<<<<< HEAD
// import {recentSessions} from "@/constants";
import {getAllCompanions, getRecentSessions} from "@/lib/actions/companion.actions";
import {getSubjectColor} from "@/lib/utils";
=======
import { getAllCompanions, getRecentSessions } from "@/lib/actions/companion.actions";
import { getSubjectColor } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
>>>>>>> d03735e (CHANGE: Major UI/UX changes UPGRADE: upragraded to next js version 16)

const Page = async () => {
  const companions = await getAllCompanions({ limit: 3 });
  const recentSessionsCompanions = await getRecentSessions(10);

  return (
    <main>
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center py-8 sm:py-12 gap-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-3.5" strokeWidth={2} />
          AI-Powered Learning
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight max-w-2xl leading-tight">
          Learn Anything with{" "}
          <span className="text-primary">Voice AI</span> Companions
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
          Create personalized AI tutors that teach through natural voice
          conversations. Choose your subject, style, and start learning.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Link href="/companions/new" className="btn-primary">
            <GraduationCap className="size-4" strokeWidth={2} />
            Create Companion
          </Link>
          <Link
            href="/companions"
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors"
          >
            Browse Library
          </Link>
        </div>
      </section>

      {/* Popular Companions */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2>Popular Companions</h2>
          <Link
            href="/companions"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>

        {companions.length > 0 ? (
          <div className="companions-grid">
            {companions.map((companion) => (
              <CompanionCard
                key={companion.id}
                {...companion}
                color={getSubjectColor(companion.subject)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No companions yet"
            description="Create your first AI learning companion to get started."
            actionLabel="Create Companion"
            actionHref="/companions/new"
          />
        )}
      </section>

      {/* Recent Sessions + CTA */}
      <section className="home-section">
        <CompanionsList
          title="Recently Completed Sessions"
          companions={recentSessionsCompanions}
          classNames="flex-1"
        />
        <CTA />
      </section>
    </main>
  );
};

export default Page;