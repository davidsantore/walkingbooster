import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function discordHeaders(token: string) {
  return {
    authorization: token,
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9007 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36",
    "x-discord-locale": "en-US",
    "x-super-properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC45MDA3Iiwib3NfdmVyc2lvbiI6IjEwLjAuMTkwNDMiLCJvc19hcmNoIjoieDY0Iiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiY2xpZW50X2J1aWxkX251bWJlciI6MTYxODQyLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ==",
  };
}

async function resolveInvite(invite: string): Promise<{ guild_id?: string; guild_name?: string; guild_icon?: string; invite_code?: string; error?: string }> {
  const code = invite
    .replace(/https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\//, "")
    .replace(/\//g, "")
    .trim();

  if (!code) return { error: "Invalid invite link" };

  const res = await fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true`);
  if (!res.ok) return { error: "Invalid or expired invite" };

  const data = await res.json();
  const guild = data.guild;
  if (!guild) return { error: "Could not resolve guild from invite" };

  const icon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : "";

  return {
    guild_id: guild.id,
    guild_name: guild.name,
    guild_icon: icon,
    invite_code: code,
  };
}

async function joinGuild(token: string, inviteCode: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
    method: "POST",
    headers: discordHeaders(token),
    body: JSON.stringify({}),
  });
  return { ok: res.status === 200 || res.status === 204 || res.status === 400, status: res.status };
}

async function boostGuild(token: string, guildId: string, subIds: string[]): Promise<number> {
  let boosted = 0;
  for (const subId of subIds) {
    try {
      const res = await fetch(`https://discord.com/api/v9/guilds/${guildId}/premium/subscriptions`, {
        method: "PUT",
        headers: discordHeaders(token),
        body: JSON.stringify({ user_premium_guild_subscription_slot_ids: [subId] }),
      });
      if (res.status === 201 || res.status === 200) boosted++;
    } catch (_) { /* continue */ }
  }
  return boosted;
}

async function getSubIds(token: string): Promise<string[]> {
  const res = await fetch("https://discord.com/api/v9/users/@me/guilds/premium/subscription-slots", {
    headers: discordHeaders(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data as Array<{ id: string }>).map((s) => s.id);
}

async function runBoostTask(taskId: string, guildId: string, inviteCode: string, boostCount: number) {
  const db = supabase();
  const { data: accounts } = await db
    .from("accounts")
    .select("id, token_full, nitro_slots")
    .eq("is_valid", true)
    .eq("has_nitro", true)
    .order("nitro_slots", { ascending: false });

  const allAccounts = accounts || [];
  let remaining = boostCount;
  const tokenDetails: Array<{
    token_short: string;
    join_status: string;
    boost_status: string;
    slots_used: number;
  }> = [];

  const stats = { total: 0, joined: 0, boosted: 0, failed: 0, total_boosts: 0 };

  // Build token detail list first
  for (const acc of allAccounts) {
    if (remaining <= 0) break;
    tokenDetails.push({
      token_short: acc.token_full.substring(0, 28),
      join_status: "waiting",
      boost_status: "waiting",
      slots_used: 0,
    });
    stats.total++;
  }

  await db.from("boost_tasks").update({
    status: "running",
    stats,
    tokens_detail: tokenDetails,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId);

  remaining = boostCount;

  for (let i = 0; i < allAccounts.length; i++) {
    if (remaining <= 0) break;
    const acc = allAccounts[i];
    const td = tokenDetails[i];
    if (!td) break;

    // Join
    try {
      const joinResult = await joinGuild(acc.token_full, inviteCode);
      if (joinResult.ok || joinResult.status === 400) {
        td.join_status = "joined";
        stats.joined++;
      } else {
        td.join_status = "failed";
        td.boost_status = "skipped";
        stats.failed++;
        await db.from("boost_tasks").update({ stats, tokens_detail: tokenDetails, updated_at: new Date().toISOString() }).eq("id", taskId);
        continue;
      }
    } catch (_) {
      td.join_status = "failed";
      td.boost_status = "skipped";
      stats.failed++;
      await db.from("boost_tasks").update({ stats, tokens_detail: tokenDetails, updated_at: new Date().toISOString() }).eq("id", taskId);
      continue;
    }

    // Get sub IDs
    const subIds = await getSubIds(acc.token_full);
    const toUse = subIds.slice(0, remaining);

    if (toUse.length === 0) {
      td.boost_status = "no_slots";
      await db.from("boost_tasks").update({ stats, tokens_detail: tokenDetails, updated_at: new Date().toISOString() }).eq("id", taskId);
      continue;
    }

    // Boost
    td.boost_status = "boosting";
    await db.from("boost_tasks").update({ stats, tokens_detail: tokenDetails, updated_at: new Date().toISOString() }).eq("id", taskId);

    const boostedCount = await boostGuild(acc.token_full, guildId, toUse);
    td.slots_used = boostedCount;
    td.boost_status = boostedCount > 0 ? "boosted" : "failed";

    if (boostedCount > 0) {
      stats.boosted++;
      stats.total_boosts += boostedCount;
      remaining -= boostedCount;
    } else {
      stats.failed++;
    }

    await db.from("boost_tasks").update({ stats, tokens_detail: tokenDetails, updated_at: new Date().toISOString() }).eq("id", taskId);

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 800));
  }

  const finalStatus = stats.total_boosts >= boostCount ? "completed" : (stats.total_boosts > 0 ? "completed" : "failed");
  await db.from("boost_tasks").update({
    status: finalStatus,
    stats,
    tokens_detail: tokenDetails,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/boost-api/, "");

  try {
    // POST /redeem - validate key, resolve invite, create task
    if (path === "/redeem" && req.method === "POST") {
      const { key, invite } = await req.json();

      if (!key || key.length !== 60) return json({ error: "Invalid key format" }, 400);
      if (!invite) return json({ error: "Invite required" }, 400);

      const db = supabase();
      const { data: keyData } = await db
        .from("boost_keys")
        .select("*")
        .eq("key_value", key)
        .maybeSingle();

      if (!keyData) return json({ error: "Key not found" }, 404);
      if (keyData.is_used) return json({ error: "Key already used", message: "This key has already been redeemed." }, 409);

      const guildInfo = await resolveInvite(invite);
      if (guildInfo.error) return json({ error: guildInfo.error }, 400);

      // Mark key as used
      await db.from("boost_keys").update({
        is_used: true,
        used_at: new Date().toISOString(),
        guild_id: guildInfo.guild_id,
        guild_name: guildInfo.guild_name,
      }).eq("id", keyData.id);

      // Create task
      const { data: task } = await db.from("boost_tasks").insert({
        key_id: keyData.id,
        guild_id: guildInfo.guild_id,
        guild_name: guildInfo.guild_name,
        guild_icon: guildInfo.guild_icon,
        invite_code: guildInfo.invite_code,
        status: "pending",
      }).select().single();

      // Run boost async
      EdgeRuntime.waitUntil(
        runBoostTask(task.id, guildInfo.guild_id!, guildInfo.invite_code!, keyData.boost_count)
      );

      return json({
        task_id: task.id,
        guild: {
          guild_id: guildInfo.guild_id,
          guild_name: guildInfo.guild_name,
          guild_icon: guildInfo.guild_icon,
        },
      });
    }

    // GET /task/:id
    if (path.startsWith("/task/") && req.method === "GET") {
      const taskId = path.replace("/task/", "");
      const db = supabase();
      const { data } = await db.from("boost_tasks").select("*").eq("id", taskId).maybeSingle();
      if (!data) return json({ error: "Task not found" }, 404);

      return json({
        status: data.status,
        stats: data.stats,
        tokens: data.tokens_detail,
        guild: {
          guild_id: data.guild_id,
          guild_name: data.guild_name,
          guild_icon: data.guild_icon,
        },
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
