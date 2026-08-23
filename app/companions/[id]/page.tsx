import { getCompanion } from "@/lib/actions/companion.actions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CompanionComponent from "@/components/CompanionComponent";

interface CompanionSessionPageProps {
  params: Promise<{ id: string }>;
}

const CompanionSession = async ({ params }: CompanionSessionPageProps) => {
  const { id } = await params;
  const companion = await getCompanion(id);
  const user = await currentUser();

  if (!user) redirect("/sign-in");
  if (!companion || !companion.name) redirect("/companions");

  return (
    <div className="session-page">
      <CompanionComponent
        {...companion}
        companionId={id}
        userName={user.firstName || "User"}
        userImage={user.imageUrl}
      />
    </div>
  );
};

export default CompanionSession;