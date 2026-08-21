import { getCompanion } from "@/lib/actions/companion.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSubjectColor } from "@/lib/utils";
import Image from "next/image";
import CompanionComponent from "@/components/CompanionComponent";
import { Clock } from "lucide-react";

interface CompanionSessionPageProps {
  params: Promise<{ id: string }>;
}

const CompanionSession = async ({ params }: CompanionSessionPageProps) => {
  const { id } = await params;
  const companion = await getCompanion(id);
  const user = await currentUser();

  if (!user) redirect("/sign-in");
  if (!companion || !companion.name) redirect("/companions");

  const { name, subject, topic, duration } = companion;

  return (
    <main>
      <article className="flex rounded-2xl border border-border bg-card justify-between p-5 sm:p-6 max-md:flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className="size-14 flex-shrink-0 flex items-center justify-center rounded-xl max-md:hidden"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            <Image
              src={`/icons/${subject}.svg`}
              alt=""
              width={28}
              height={28}
              aria-hidden
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl">{name}</h1>
              <div className="subject-badge max-sm:hidden">{subject}</div>
            </div>
            <p className="text-muted-foreground">{topic}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground max-md:hidden">
          <Clock className="size-4" strokeWidth={1.8} />
          <span className="text-lg">{duration} min</span>
        </div>
      </article>

      <CompanionComponent
        {...companion}
        companionId={id}
        userName={user.firstName || "User"}
        userImage={user.imageUrl}
      />
    </main>
  );
};

export default CompanionSession;