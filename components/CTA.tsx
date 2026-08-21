import Image from "next/image";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="cta-section" aria-label="Create a companion">
      <div className="cta-badge">
        <Sparkles className="inline size-3.5 mr-1" strokeWidth={2} />
        Start learning your way
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold font-display">
        Build and Personalize Your Learning Companion
      </h2>
      <p className="text-sm text-white/70 leading-relaxed max-w-xs">
        Pick a name, subject, voice, &amp; personality — and start learning through
        voice conversations that feel natural and fun.
      </p>
      <Image
        src="/images/cta.svg"
        alt="AI learning companion illustration"
        width={320}
        height={205}
        className="my-2 opacity-90"
      />
      <Link
        href="/companions/new"
        className="btn-primary w-full sm:w-auto justify-center"
      >
        <Plus className="size-4" strokeWidth={2} />
        Build a New Companion
      </Link>
    </section>
  );
};

export default CTA;