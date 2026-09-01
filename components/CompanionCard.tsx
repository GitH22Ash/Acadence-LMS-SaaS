"use client";

import { removeBookmark, addBookmark } from "@/lib/actions/companion.actions";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Clock,
  ArrowRight,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteCompanionDialog } from "@/components/DeleteCompanionDialog";
import { useState } from "react";

interface CompanionCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
  bookmarked: boolean;
}

const CompanionCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
  bookmarked,
}: CompanionCardProps) => {
  const pathname = usePathname();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleBookmark = async () => {
    if (bookmarked) {
      await removeBookmark(id, pathname);
    } else {
      await addBookmark(id, pathname);
    }
  };

  return (
    <article className="companion-card group">
      {/* Header: subject badge + actions */}
      <div className="flex justify-between items-center">
        <div
          className="subject-badge"
          style={{
            backgroundColor: `${color}20`,
            color: color ? undefined : undefined,
          }}
        >
          <span className="flex items-center gap-1.5">
            <Image
              src={`/icons/${subject}.svg`}
              alt=""
              width={14}
              height={14}
              className="w-3.5 h-3.5 shrink-0"
              aria-hidden
            />
            {subject}
          </span>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md text-muted-foreground hover:bg-muted focus:outline-none transition-colors">
              <MoreVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
            >
              <Bookmark
                className={`mr-2 size-4 ${
                  bookmarked ? "fill-primary text-primary" : ""
                }`}
              />
              {bookmarked ? "Remove Bookmark" : "Bookmark"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Companion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="text-xl font-bold tracking-tight">{name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {topic}
        </p>
      </div>

      {/* Footer: duration + CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" strokeWidth={1.8} />
          <span className="text-sm">{duration} min</span>
        </div>
        <Link href={`/companions/${id}`}>
          <span className="btn-primary text-sm py-2 px-4 group-hover:gap-3 transition-all">
            Launch
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        </Link>
      </div>

      <DeleteCompanionDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        companionId={id}
        companionName={name}
      />
    </article>
  );
};

export default CompanionCard;