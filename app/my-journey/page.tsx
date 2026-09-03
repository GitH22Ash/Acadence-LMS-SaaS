import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getUserCompanions,
  getUserSessions,
  getBookmarkedCompanions,
} from "@/lib/actions/companion.actions";
import { getUserTopics } from "@/lib/actions/topic.actions";
import { getLearningRecommendations } from "@/lib/actions/recommendation.actions";
import { getUserQuizzes, getUserDecks } from "@/lib/actions/practice.actions";
import { CheckCircle2, GraduationCap, Target, Clock, ArrowRight, BrainCircuit, Library } from "lucide-react";
import CompanionsList from "@/components/CompanionsList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { createSupabaseClient } from "@/lib/supabase";

const MyJourney = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Fetch all necessary data
  const supabase = createSupabaseClient();
  const [
    companions,
    sessionHistory,
    bookmarkedCompanions,
    topics,
    recommendations,
    quizzes,
    decks,
    { data: learningSessions }
  ] = await Promise.all([
    getUserCompanions(user.id),
    getUserSessions(user.id),
    getBookmarkedCompanions(user.id),
    getUserTopics(),
    getLearningRecommendations(),
    getUserQuizzes(),
    getUserDecks(),
    supabase.from("learning_sessions").select("duration_seconds").eq("user_id", user.id)
  ]);

  // Derived stats
  const totalLearningTime = (learningSessions || []).reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
  const hours = Math.floor(totalLearningTime / 3600);
  const minutes = Math.floor((totalLearningTime % 3600) / 60);

  const completedQuizzes = quizzes.filter(q => q.attempt_count > 0);
  const totalQuizScore = completedQuizzes.reduce((acc, q) => acc + (q.last_score || 0), 0);
  const totalQuizQuestions = completedQuizzes.reduce((acc, q) => acc + (q.last_total || 0), 0);
  const quizAccuracy = totalQuizQuestions > 0 ? Math.round((totalQuizScore / totalQuizQuestions) * 100) : 0;

  const totalCards = decks.reduce((acc, d) => acc + d.card_count, 0);

  // Group topics by subject
  const subjectsMap = topics.reduce((acc, topic) => {
    if (!acc[topic.subject]) {
      acc[topic.subject] = { totalMastery: 0, count: 0 };
    }
    acc[topic.subject].totalMastery += topic.mastery_score || 0;
    acc[topic.subject].count += 1;
    return acc;
  }, {} as Record<string, { totalMastery: number; count: number }>);

  const weakTopics = topics.filter(t => t.needs_review);

  return (
    <main className="flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-semibold">
          Good morning, {user.firstName}.
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s how your learning is progressing.
        </p>
      </section>

      {/* Overview Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="size-4" />
            Learning Time
          </div>
          <p className="text-2xl font-semibold font-display">
            {hours > 0 ? `${hours}h ` : ""}{minutes}m
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CheckCircle2 className="size-4 text-success" />
            Sessions
          </div>
          <p className="text-2xl font-semibold font-display">{sessionHistory.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="size-4 text-primary" />
            Quiz Accuracy
          </div>
          <p className="text-2xl font-semibold font-display">{quizAccuracy}%</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Library className="size-4 text-primary" />
            Cards Created
          </div>
          <p className="text-2xl font-semibold font-display">{totalCards}</p>
        </div>
      </section>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Progress & Weaknesses */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Your Subjects */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">Your Subjects</h2>
            {Object.keys(subjectsMap).length > 0 ? (
              <div className="flex flex-col gap-4">
                {Object.entries(subjectsMap).map(([subject, data]) => {
                  const typedData = data as { totalMastery: number; count: number };
                  const avgMastery = Math.round(typedData.totalMastery / typedData.count);
                  return (
                    <div key={subject} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-lg">{subject}</h3>
                        <span className="font-semibold">{avgMastery}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${avgMastery}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-card border border-border p-5 rounded-2xl">
                No subjects started yet. Complete a session to see progress.
              </p>
            )}
          </section>

          {/* Needs Attention */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display text-destructive">Needs Attention</h2>
            {weakTopics.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {weakTopics.map(topic => (
                  <div key={topic.id} className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-destructive">{topic.name}</h3>
                      <p className="text-sm text-muted-foreground">{topic.mastery_score}% mastery</p>
                    </div>
                    <Link href={`/practice/quizzes?adaptive=true&subject=${encodeURIComponent(topic.subject)}`} className="text-sm font-medium text-destructive hover:underline flex items-center gap-1 w-fit">
                      Review Topic <ArrowRight className="size-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-card border border-border p-5 rounded-2xl">
                You're doing great! No weak topics detected right now.
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Recommendations & Actions */}
        <div className="flex flex-col gap-8">
          
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">Today's Recommendations</h2>
            <div className="flex flex-col gap-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                  <Link 
                    key={i} 
                    href={rec.href}
                    className="bg-primary text-primary-foreground p-5 rounded-2xl flex flex-col gap-2 hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <BrainCircuit className="size-4" />
                      {rec.title}
                    </div>
                    <p className="text-sm opacity-90">{rec.description}</p>
                  </Link>
                ))
              ) : (
                <div className="bg-card border border-border p-5 rounded-2xl text-sm text-muted-foreground">
                  No recommendations right now. Check back later!
                </div>
              )}
            </div>
          </section>

          {/* History Accordions */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold font-display">History</h2>
            <Accordion type="multiple" className="space-y-2">
              <AccordionItem value="recent" className="border border-border rounded-2xl px-4 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Recent Sessions
                </AccordionTrigger>
                <AccordionContent>
                  <CompanionsList
                    title="Recent Sessions"
                    companions={sessionHistory}
                    hideTitle
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="companions" className="border border-border rounded-2xl px-4 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  My Companions
                </AccordionTrigger>
                <AccordionContent>
                  <CompanionsList title="My Companions" companions={companions} hideTitle />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

        </div>
      </div>
    </main>
  );
};

export default MyJourney;