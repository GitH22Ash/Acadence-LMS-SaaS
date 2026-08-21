import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, getSubjectColor } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface CompanionsListProps {
  title: string;
  companions?: Companion[];
  classNames?: string;
}

const CompanionsList = ({
  title,
  companions,
  classNames,
}: CompanionsListProps) => {
  return (
    <article className={cn("companion-list", classNames)}>
      <h2 className="font-bold text-2xl mb-4">{title}</h2>

      {!companions || companions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Start a learning session with a companion to see your history here."
          actionLabel="Browse Companions"
          actionHref="/companions"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm font-medium text-muted-foreground w-2/3">
                Lesson
              </TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">
                Subject
              </TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground text-right">
                Duration
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companions.map(({ id, subject, name, topic, duration }, index) => (
              <TableRow key={`${id}-${index}`} className="group hover:bg-secondary/40 transition-colors">
                <TableCell>
                  <Link href={`/companions/${id}`} className="flex items-center gap-3">
                    <div
                      className="size-12 flex-shrink-0 flex items-center justify-center rounded-xl max-md:hidden"
                      style={{
                        backgroundColor: getSubjectColor(subject),
                      }}
                    >
                      <Image
                        src={`/icons/${subject}.svg`}
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                        {name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {topic}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="subject-badge w-fit max-md:hidden">
                    {subject}
                  </div>
                  <div
                    className="flex items-center justify-center rounded-lg w-fit p-1.5 md:hidden"
                    style={{
                      backgroundColor: getSubjectColor(subject),
                    }}
                  >
                    <Image
                      src={`/icons/${subject}.svg`}
                      alt={subject}
                      width={16}
                      height={16}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 w-full justify-end text-muted-foreground">
                    <Clock className="size-3.5 md:hidden" strokeWidth={1.8} />
                    <span className="text-sm">
                      {duration}{" "}
                      <span className="max-md:hidden">min</span>
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </article>
  );
};

export default CompanionsList;