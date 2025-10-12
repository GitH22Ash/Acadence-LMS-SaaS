'use server';

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth();
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .insert({ ...formData, author })
        .select();

    if (error || !data) throw new Error(error?.message || 'Failed to create a companion');

    return data[0];
}

// ✅ CORRECTED FUNCTION
export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const { userId } = await auth();

    // If no user is logged in, return an empty array.
    if (!userId) {
        return [];
    }

    const supabase = await createSupabaseClient();

    // Start the query by filtering for companions created by the current user.
    let query = supabase.from('companions').select('*').eq('author', userId);

    // Apply additional filters if they exist
    if (subject && topic) {
        query = query.ilike('subject', `%${subject}%`)
            .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
    } else if (subject) {
        query = query.ilike('subject', `%${subject}%`);
    } else if (topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: companions, error } = await query;

    if (error) throw new Error(error.message);
    if (!companions) return [];

    // Fetch the user's bookmarks to correctly set the 'bookmarked' status
    const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('companion_id')
        .eq('user_id', userId);

    if (bookmarksError) {
        console.error('Failed to fetch bookmarks:', bookmarksError.message);
        // If bookmarks fail, still return companions but mark them all as not bookmarked.
        return companions.map(companion => ({ ...companion, bookmarked: false }));
    }

    const bookmarkedIds = new Set(bookmarks.map(b => b.companion_id));

    const companionsWithBookmarkStatus = companions.map(companion => ({
        ...companion,
        bookmarked: bookmarkedIds.has(companion.id)
    }));

    return companionsWithBookmarkStatus;
}


// --- THE REST OF THE FILE IS CORRECT ---

export const getCompanion = async (id: string) => {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('id', id);

    if (error) return console.log(error);

    return data[0];
}

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.from('session_history')
        .insert({
            companion_id: companionId,
            user_id: userId,
        });

    if (error) throw new Error(error.message);

    return data;
}

export const getRecentSessions = async (limit = 10) => {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions);
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions);
}

export const getUserCompanions = async (userId: string) => {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('author', userId);

    if (error) throw new Error(error.message);

    return data;
}

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth();
    const supabase = await createSupabaseClient();

    let limit = 0;

    if (has({ plan: 'pro' })) {
        return true;
    } else if (has({ feature: "3_active_companions" })) {
        limit = 3;
    } else if (has({ feature: "10_active_companions" })) {
        limit = 10;
    }

    const { data, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact' })
        .eq('author', userId);

    if (error) throw new Error(error.message);

    const companionCount = data?.length;

    return !(companionCount >= limit);
}

// Bookmarks
export const addBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.from("bookmarks").insert({
        companion_id: companionId,
        user_id: userId,
    });
    if (error) {
        throw new Error(error.message);
    }
    revalidatePath(path);
    return data;
};

export const removeBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("companion_id", companionId)
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }
    revalidatePath(path);
    return data;
};

export const getBookmarkedCompanions = async (userId: string) => {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .select(`companions:companion_id (*)`)
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }
    return data.map(({ companions }) => companions);
};