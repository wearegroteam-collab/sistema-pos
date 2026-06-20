import { createClient } from "@supabase/supabase-js";

async function readEnvFile(path) {
  try {
    const fs = await import("node:fs");
    const content = fs.readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // Optional local env file.
  }
}

await readEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey || url.includes("your-project") || anonKey.includes("your-anon-key")) {
  console.error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);
const { error } = await supabase.from("businesses").select("id").limit(1);

if (error) {
  console.error(`Supabase connection failed: ${error.message}`);
  process.exit(1);
}

console.log("Supabase connection OK.");
