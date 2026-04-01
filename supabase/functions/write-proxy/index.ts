import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// In-memory rate limit store (resets on cold start — acceptable for v1)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, project_id, data } = body;

    if (!project_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing project_id or action" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate origin against project's allowed_domains
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("allowed_domains")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    // Check origin matches allowed domains
    let originHost: string;
    try {
      originHost = new URL(origin).hostname;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid origin" }), {
        status: 403,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const domainAllowed = project.allowed_domains.some(
      (domain: string) =>
        originHost === domain || originHost.endsWith(`.${domain}`),
    );

    if (!domainAllowed) {
      return new Response(JSON.stringify({ error: "Domain not authorized" }), {
        status: 403,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    let result;

    if (action === "create_annotation") {
      const { error, data: annotation } = await supabase
        .from("annotations")
        .insert({ ...data, project_id })
        .select()
        .single();
      if (error) throw error;
      result = annotation;
    } else if (action === "create_reply") {
      // Validate that the annotation belongs to this project
      const { data: parentAnnotation, error: annError } = await supabase
        .from("annotations")
        .select("id")
        .eq("id", data.annotation_id)
        .eq("project_id", project_id)
        .single();
      if (annError || !parentAnnotation) {
        return new Response(JSON.stringify({ error: "Annotation not found in this project" }), {
          status: 404,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
      const { error, data: reply } = await supabase
        .from("replies")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      result = reply;
    } else if (action === "upload_screenshot") {
      const { path, base64 } = data;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error } = await supabase.storage
        .from("screenshots")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (error) throw error;
      result = { path };
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
