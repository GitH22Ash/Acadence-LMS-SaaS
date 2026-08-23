import Link from "next/link";
import Image from "next/image";
import { SignInButton, Show, UserButton } from "@clerk/nextjs";
import NavItems from "@/components/Navitems";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { MobileNav } from "@/components/shared/MobileNav";

const Navbar = () => {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/images/logo.png"
          alt="Acadence"
          width={36}
          height={34}
          className="rounded-lg"
          priority
        />
        <span className="font-display font-bold text-lg tracking-tight text-foreground max-sm:hidden">
          Acadence
        </span>
      </Link>

      {/* Desktop navigation */}
      <div className="hidden md:flex items-center gap-6">
        <NavItems />
        <ThemeToggle />
        <Show when="signed-out">
          <SignInButton>
            <button className="btn-signin">Sign In</button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9",
              },
            }}
          />
        </Show>
      </div>

      {/* Mobile navigation */}
      <div className="flex md:hidden items-center gap-3">
        <ThemeToggle />
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
        </Show>
        <Show when="signed-out">
          <SignInButton>
            <button className="btn-signin text-xs px-3 py-1.5">Sign In</button>
          </SignInButton>
        </Show>
        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;