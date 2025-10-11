import {createClient} from "@supabase/supabase-js";
import {auth} from "@clerk/nextjs/server";

//To setup the supabase configuration and client with Clerk authentication integration
export const createSupabaseClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            async accessToken() {
                return ((await auth()).getToken());
            }
        }
    )
}