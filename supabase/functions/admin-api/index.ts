import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-admin-token",
};
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "visionario2025";

function supabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function validateSession(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return false;
  const db = supabase();
  const { data } = await db
    .from("admin_sessions")
    .select("id")
    .eq("session_token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}

function generateKey(length = 60): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

async function fetchDiscordUserInfo(token: string) {
  const headers = {
    authorization: token,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9007 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36",
    "x-discord-locale": "en-US",
  };

  const userRes = await fetch("https://discord.com/api/v9/users/@me", { headers });
  if (!userRes.ok) {
    return { valid: false, reason: userRes.status === 401 ? "Invalid token" : "Token unauthorized" };
  }
  const user = await userRes.json();

  const slotsRes = await fetch("https://discord.com/api/v9/users/@me/guilds/premium/subscription-slots", { headers });
  let slots: string[] = [];
  let hasNitro = false;
  if (slotsRes.ok) {
    const slotsData = await slotsRes.json();
    slots = slotsData.map((s: { id: string }) => s.id);
    hasNitro = slots.length > 0;
  }

  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || "0") % 5}.png`;

  return {
    valid: true,
    username: user.username,
    discriminator: user.discriminator || "0",
    avatar_url: avatar,
    nitro_slots: slots.length,
    has_nitro: hasNitro,
    user_id: user.id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-api/, "");

  try {
    // --- LOGIN ---
    if (path === "/login" && req.method === "POST") {
      const { password } = await req.json();
      if (password !== ADMIN_PASSWORD) {
        return json({ error: "Invalid password" }, 401);
      }
      const sessionToken = crypto.randomUUID() + "-" + Date.now();
      const db = supabase();
      await db.from("admin_sessions").insert({ session_token: sessionToken });
      return json({ session_token: sessionToken });
    }

    // All routes below require valid session
    const authed = await validateSession(req);
    if (!authed) return json({ error: "Unauthorized" }, 401);

    // --- ACCOUNTS ---
    if (path === "/accounts" && req.method === "GET") {
      const db = supabase();
      const { data } = await db.from("accounts").select("*").order("created_at", { ascending: false });
      return json(data || []);
    }

    if (path === "/accounts" && req.method === "POST") {
      const { token } = await req.json();
      if (!token) return json({ error: "Token required" }, 400);

      const info = await fetchDiscordUserInfo(token.trim());
      if (!info.valid) return json({ error: info.reason || "Invalid token" }, 400);

      const db = supabase();
      const { data: existing } = await db
        .from("accounts")
        .select("id")
        .eq("token_full", token.trim())
        .maybeSingle();

      if (existing) return json({ error: "Token already added" }, 409);

      const { data, error } = await db
        .from("accounts")
        .insert({
          token_full: token.trim(),
          username: info.username,
          discriminator: info.discriminator,
          avatar_url: info.avatar_url,
          nitro_slots: info.nitro_slots,
          has_nitro: info.has_nitro,
          is_valid: true,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json(data, 201);
    }

    if (path.startsWith("/accounts/") && req.method === "DELETE") {
      const id = path.replace("/accounts/", "");
      const db = supabase();
      await db.from("accounts").delete().eq("id", id);
      return json({ success: true });
    }

    // Refresh account info
    if (path.startsWith("/accounts/") && path.endsWith("/refresh") && req.method === "POST") {
      const id = path.replace("/accounts/", "").replace("/refresh", "");
      const db = supabase();
      const { data: acc } = await db.from("accounts").select("token_full").eq("id", id).maybeSingle();
      if (!acc) return json({ error: "Account not found" }, 404);

      const info = await fetchDiscordUserInfo(acc.token_full);
      const { data } = await db
        .from("accounts")
        .update({
          username: info.valid ? info.username : acc.username ?? "",
          avatar_url: info.valid ? info.avatar_url : "",
          nitro_slots: info.valid ? info.nitro_slots : 0,
          has_nitro: info.valid ? info.has_nitro : false,
          is_valid: info.valid ?? false,
        })
        .eq("id", id)
        .select()
        .single();

      return json(data);
    }

    // --- KEYS ---
    if (path === "/keys" && req.method === "GET") {
      const db = supabase();
      const { data } = await db.from("boost_keys").select("*").order("created_at", { ascending: false });
      return json(data || []);
    }

    if (path === "/keys" && req.method === "POST") {
      const { boost_count, label } = await req.json();
      if (!boost_count || boost_count < 1) return json({ error: "boost_count must be >= 1" }, 400);

      const db = supabase();
      // Check available slots
      const { data: accounts } = await db
        .from("accounts")
        .select("nitro_slots")
        .eq("is_valid", true)
        .eq("has_nitro", true);

      const totalSlots = (accounts || []).reduce((s, a) => s + (a.nitro_slots || 0), 0);
      if (boost_count > totalSlots) {
        return json({ error: `Not enough boost slots. Available: ${totalSlots}` }, 400);
      }

      const keyValue = generateKey(60);
      const { data, error } = await db
        .from("boost_keys")
        .insert({ key_value: keyValue, boost_count, label: label || "" })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json(data, 201);
    }

    if (path.startsWith("/keys/") && req.method === "DELETE") {
      const id = path.replace("/keys/", "");
      const db = supabase();
      await db.from("boost_keys").delete().eq("id", id);
      return json({ success: true });
    }

    // --- TASKS ---
    if (path === "/tasks" && req.method === "GET") {
      const db = supabase();
      const { data } = await db
        .from("boost_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return json(data || []);
    }

    // --- STATS ---
    if (path === "/stats" && req.method === "GET") {
      const db = supabase();
      const [accsRes, keysRes, tasksRes] = await Promise.all([
        db.from("accounts").select("id, has_nitro, is_valid, nitro_slots"),
        db.from("boost_keys").select("id, is_used"),
        db.from("boost_tasks").select("id, status"),
      ]);

      const accounts = accsRes.data || [];
      const keys = keysRes.data || [];
      const tasks = tasksRes.data || [];

      return json({
        total_accounts: accounts.length,
        valid_accounts: accounts.filter((a) => a.is_valid).length,
        nitro_accounts: accounts.filter((a) => a.has_nitro).length,
        total_slots: accounts.reduce((s, a) => s + (a.nitro_slots || 0), 0),
        total_keys: keys.length,
        used_keys: keys.filter((k) => k.is_used).length,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === "completed").length,
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
