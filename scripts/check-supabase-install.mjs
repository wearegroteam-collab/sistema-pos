import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(JSON.stringify({ ok: false, error: "Missing Supabase URL or anon key" }, null, 2));
  process.exit(1);
}

const supabase = createClient(url, anon);

const tables = [
  "businesses",
  "business_users",
  "invitations",
  "categories",
  "products",
  "extras",
  "product_extras",
  "restaurant_tables",
  "orders",
  "order_items",
  "order_item_extras",
  "payments",
  "shifts",
  "settings",
  "audit_logs"
];

const rpcs = [
  ["is_super_admin", {}],
  ["can_access_business", { target_business_id: "00000000-0000-0000-0000-000000000001" }],
  ["is_business_admin", { target_business_id: "00000000-0000-0000-0000-000000000001" }],
  ["resend_invitation", { invitation_id: "00000000-0000-0000-0000-000000000000" }],
  ["clear_test_data", { target_business_id: "00000000-0000-0000-0000-000000000001" }]
];

const result = {
  connection: false,
  tables: {},
  rpcs: {},
  buckets: {},
  demoBusiness: null,
  demoUsers: null,
  notes: []
};

const connectionProbe = await supabase.from("businesses").select("id").limit(1);
result.connection = !connectionProbe.error || !String(connectionProbe.error.message).includes("fetch");

for (const table of tables) {
  const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
  result.tables[table] = {
    exists: !error || !["PGRST205", "42P01"].includes(error.code),
    countVisibleWithAnon: error ? null : count,
    error: error ? { code: error.code, message: error.message } : null
  };
}

for (const [name, args] of rpcs) {
  const { error, data } = await supabase.rpc(name, args);
  result.rpcs[name] = {
    exists: !error || !["PGRST202", "42883"].includes(error.code),
    callableAsAnon: !error,
    data,
    error: error ? { code: error.code, message: error.message } : null
  };
}

const bucketList = await supabase.storage.listBuckets();
result.buckets.listBuckets = {
  callableAsAnon: !bucketList.error,
  buckets: bucketList.data?.map((bucket) => bucket.name) ?? [],
  error: bucketList.error ? { message: bucketList.error.message } : null
};

const demoBusiness = await supabase
  .from("businesses")
  .select("id,name,demo,test_mode,status")
  .eq("id", "00000000-0000-0000-0000-000000000001")
  .maybeSingle();
result.demoBusiness = demoBusiness.error ? { error: demoBusiness.error.message } : demoBusiness.data;

const demoUsers = await supabase
  .from("business_users")
  .select("email,role,status,business_id")
  .eq("business_id", "00000000-0000-0000-0000-000000000001");
result.demoUsers = demoUsers.error ? { error: demoUsers.error.message } : demoUsers.data;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_DB_URL) {
  result.notes.push("No SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_URL available, so policies cannot be introspected from pg_policies and auth.users cannot be inspected.");
}

console.log(JSON.stringify(result, null, 2));
