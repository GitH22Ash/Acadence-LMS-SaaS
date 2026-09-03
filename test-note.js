require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

sb.from("learning_notes")
  .select("summary, key_concepts, important_points, examples")
  .eq("id", "599183ab-f91b-4aa6-a588-96b51bbb9635")
  .single()
  .then(res => {
    console.log(JSON.stringify(res.data, null, 2));
  })
  .catch(console.error);
