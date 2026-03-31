// admin/js/projects-list.js
import { getSupabase } from "./supabase-client.js";

export async function loadProjects() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_email", user.email)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch annotation counts for each project
  const projectsWithCounts = await Promise.all(
    (projects || []).map(async (project) => {
      const { count: openCount } = await supabase
        .from("annotations")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "open");

      const { count: resolvedCount } = await supabase
        .from("annotations")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "resolved");

      return { ...project, openCount: openCount || 0, resolvedCount: resolvedCount || 0 };
    }),
  );

  return projectsWithCounts;
}

export async function createProject(name, domains) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      allowed_domains: domains,
      owner_email: user.email,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function renderProjectCard(project) {
  const card = document.createElement("div");
  card.className = "card project-card";

  const title = document.createElement("h3");
  title.textContent = project.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = project.allowed_domains.join(", ");

  const counts = document.createElement("div");
  counts.className = "counts";

  const openSpan = document.createElement("span");
  const openStatus = document.createElement("span");
  openStatus.className = "status status-open";
  openStatus.textContent = `${project.openCount} open`;
  openSpan.appendChild(openStatus);

  const resolvedSpan = document.createElement("span");
  const resolvedStatus = document.createElement("span");
  resolvedStatus.className = "status status-resolved";
  resolvedStatus.textContent = `${project.resolvedCount} resolved`;
  resolvedSpan.appendChild(resolvedStatus);

  counts.appendChild(openSpan);
  counts.appendChild(resolvedSpan);

  const dateMeta = document.createElement("div");
  dateMeta.className = "meta mt-4";
  dateMeta.textContent = `Created ${new Date(project.created_at).toLocaleDateString()}`;

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(counts);
  card.appendChild(dateMeta);

  card.addEventListener("click", () => {
    window.location.href = `project.html?id=${project.id}`;
  });
  return card;
}
