export const dynamic = "force-dynamic";

import CompanionCard from "@/components/CompanionCard";
import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
import { getAllCompanions, getRecentSessions } from "@/lib/actions/companion.actions";
import { getLearningRecommendations } from "@/lib/actions/recommendation.actions";
import { getUserTopics } from "@/lib/actions/topic.actions";
import { getDueCards } from "@/lib/actions/practice.actions";
import { getSubjectColor } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { GraduationCap, Sparkles, ArrowRight, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

const Page = async () => {
  const user = await currentUser();

  if (user) {
    const [recommendations, topics, dueCards, userCompanions] = await Promise.all([
      getLearningRecommendations(),
      getUserTopics(),
      getDueCards(),
      getAllCompanions({ limit: 1 }),
    ]);

    const continueSessionRec = recommendations.find(r => r.type === "continue_session");
    const otherRecs = recommendations.filter(r => r.type !== "continue_session");
    const weakTopics = topics.filter(t => t.needs_review);

    if (userCompanions.length === 0) {
      return (
        <main className="flex flex-col gap-10">
          <section className="flex flex-col gap-2">
            <h1 className="text-3xl font-display font-semibold">
              Good morning, {user.firstName}.
            </h1>
            <p className="text-muted-foreground">Start your learning journey.</p>
          </section>

          <section className="flex flex-col gap-4">
            <div className="bg-primary text-primary-foreground p-6 rounded-3xl flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Welcome</span>
                <h2 className="text-2xl font-bold">Build your first AI learning companion.</h2>
                <p className="opacity-90">Create a personalized AI tutor to teach you anything through natural voice conversations.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/companions/new" className="bg-background text-foreground px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap flex items-center">
                  <Sparkles className="size-4 mr-2 text-primary" />
                  <span className="text-primary">Create Companion</span>
                </Link>
                <Link href="/companions" className="px-6 py-3 rounded-full font-semibold text-sm hover:bg-white/10 transition-colors whitespace-nowrap">
                  Explore
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="flex flex-col gap-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-display font-semibold">
              Good morning, {user.firstName}.
            </h1>
            <p className="text-muted-foreground">Ready to continue learning?</p>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/companions" className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors">
               Explore Companions
             </Link>
             <Link href="/companions/new" className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center">
               <Sparkles className="size-4 mr-2" />
               Create Companion
             </Link>
          </div>
        </section>

        {continueSessionRec ? (
          <section className="flex flex-col gap-4">
            <div className="bg-primary text-primary-foreground p-6 rounded-3xl flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Continue Learning</span>
                <h2 className="text-2xl font-bold">{continueSessionRec.title}</h2>
                <p className="opacity-90">{continueSessionRec.description}</p>
              </div>
              <Link href={continueSessionRec.href} className="bg-background text-foreground px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">
                Continue
              </Link>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="bg-secondary text-secondary-foreground border border-border p-6 rounded-3xl flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Start Learning</span>
                <h2 className="text-2xl font-bold">Jump into a session</h2>
                <p className="opacity-90 text-muted-foreground">Start a session with your companions to build your learning history.</p>
              </div>
              <Link href="/companions" className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap">
                Browse Companions
              </Link>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* TODAY */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">Today</h2>
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="font-medium text-muted-foreground">{dueCards.length} flashcards due</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="font-medium text-muted-foreground">{weakTopics.length} topics need review</span>
              </div>
              <Link href="/practice/flashcards/review" className="btn-primary w-full justify-center">
                Start Smart Review
              </Link>
            </div>
          </section>

          {/* RECOMMENDED */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">Recommended</h2>
            <div className="flex flex-col gap-3">
              {otherRecs.length > 0 ? (
                otherRecs.map((rec, i) => (
                  <Link 
                    key={i} 
                    href={rec.href}
                    className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="size-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{rec.title}</h3>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                ))
              ) : (
                <div className="bg-card border border-border p-4 rounded-2xl text-sm text-muted-foreground">
                  You're all caught up for today!
                </div>
              )}
            </div>
          </section>
        </div>

        {/* YOUR PROGRESS (Summary) */}
        {topics.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">Your Progress</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(new Set(topics.map(t => t.subject))).slice(0, 3).map(subject => {
                const subjectTopics = topics.filter(t => t.subject === subject);
                const avg = Math.round(subjectTopics.reduce((a, b) => a + (b.mastery_score||0), 0) / subjectTopics.length);
                return (
                  <div key={subject} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{subject}</span>
                      <span className="font-semibold">{avg}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${avg}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/my-journey" className="text-sm text-primary font-medium flex items-center gap-1 w-fit mt-2">
              View full dashboard <ArrowRight className="size-3" />
            </Link>
          </section>
        )}
      </main>
    );
  }

  // PUBLIC HOMEPAGE FOR UNAUTHENTICATED USERS
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