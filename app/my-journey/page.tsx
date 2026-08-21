import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getUserCompanions,
  getUserSessions,
  getBookmarkedCompanions,
} from "@/lib/actions/companion.actions";
import Image from "next/image";
import CompanionsList from "@/components/CompanionsList";
import { CheckCircle2, GraduationCap, Bookmark, History, Users } from "lucide-react";

const Profile = async () => {
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const companions = await getUserCompanions(user.id);
  const sessionHistory = await getUserSessions(user.id);
  const bookmarkedCompanions = await getBookmarkedCompanions(user.id);

  return (
    <main>
      {/* Profile header */}
      <section className="flex justify-between gap-6 max-sm:flex-col items-center">
        <div className="flex gap-4 items-center">
          <Image
            src={user.imageUrl}
            alt={user.firstName || "User"}
            width={80}
            height={80}
            className="rounded-2xl"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.emailAddresses[0].emailAddress}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="border border-border rounded-2xl p-4 gap-2 flex flex-col h-fit bg-card min-w-[120px]">
            <div className="flex gap-2 items-center">
              <CheckCircle2 className="size-5 text-success" strokeWidth={1.8} />
              <p className="text-2xl font-bold">{sessionHistory.length}</p>
            </div>
            <span className="text-xs text-muted-foreground">Lessons completed</span>
          </div>
          <div className="border border-border rounded-2xl p-4 gap-2 flex flex-col h-fit bg-card min-w-[120px]">
            <div className="flex gap-2 items-center">
              <GraduationCap className="size-5 text-primary" strokeWidth={1.8} />
              <p className="text-2xl font-bold">{companions.length}</p>
            </div>
            <span className="text-xs text-muted-foreground">Companions created</span>
          </div>
        </div>
      </section>

      {/* Accordions */}
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="bookmarks" className="border border-border rounded-2xl px-4 bg-card">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
            <span className="flex items-center gap-2">
              <Bookmark className="size-4 text-primary" strokeWidth={1.8} />
              Bookmarked Companions ({bookmarkedCompanions.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CompanionsList
              companions={bookmarkedCompanions}
              title="Bookmarked Companions"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="recent" className="border border-border rounded-2xl px-4 bg-card">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
            <span className="flex items-center gap-2">
              <History className="size-4 text-primary" strokeWidth={1.8} />
              Recent Sessions
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CompanionsList
              title="Recent Sessions"
              companions={sessionHistory}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="companions" className="border border-border rounded-2xl px-4 bg-card">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
            <span className="flex items-center gap-2">
              <Users className="size-4 text-primary" strokeWidth={1.8} />
              My Companions ({companions.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CompanionsList title="My Companions" companions={companions} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};

export default Profile;