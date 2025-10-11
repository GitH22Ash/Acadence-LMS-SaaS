import {getCompanion} from "@/lib/actions/companion.actions";
import {currentUser} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {getSubjectColor} from "@/lib/utils";
import Image from "next/image";
import CompanionComponent from "@/components/CompanionComponent";

interface CompanionSessionPageProps {
    params: Promise<{ id: string}>;
}
//difference between params and searchParams
//params /url/{id} -> id 
//searchParams /url?key=value&key1= value1

const CompanionSession = async ({ params }: CompanionSessionPageProps) => {
    const { id } = await params;
    const companion = await getCompanion(id);
    const user = await currentUser();

    const { name, subject, title, topic, duration } = companion;
    //destructuring companion to ensure all fields are present

    if(!user) redirect('/sign-in');
    if(!name) redirect('/companions')

    return (
        <main>
            <article className="flex rounded-border justify-between p-6 max-md:flex-col">
                <div className="flex items-center gap-2">
                    <div className="size-[72px] flex items-center justify-center rounded-lg max-md:hidden" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <Image src={`/icons/${subject}.svg`} alt={subject} width={35} height={35} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-2xl">
                                {name}
                            </p>
                            <div className="subject-badge max-sm:hidden">
                                {subject}
                            </div>
                        </div>
                        <p className="text-lg">{topic}</p>
                    </div>
                </div>
                <div className="items-start text-2xl max-md:hidden">
                    {duration} minutes
                </div>
            </article>
            {/* along with the companion details we also need to pass the user details to the CompanionComponent
             so that we can display the user avatar and name in the CompanionComponent
             we can get the user details from the currentUser function from Clerk */}
            <CompanionComponent
                {...companion}
                companionId={id}
                userName={user.firstName!}
                userImage={user.imageUrl!}
            />
        </main>
    )
}

export default CompanionSession
//for dynamic routing of individual companion sessions based on their IDs we use the [id] folder
//this file is app/companions/[id]/page.tsx
//the [id] in the path indicates that this is a dynamic route and the id can be any value
//we can access the id value using the useRouter hook from next/router
//we can then use this id to fetch the companion session data from the backend and display it on this page
//the naming convention of using square brackets for dynamic routes is a feature of Next.js
//more about dynamic routing in Next.js can be found here: https://nextjs.org/docs/routing/dynamic-routes