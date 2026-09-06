import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const libraryBucket = "igaf-library";
export const ADMIN_EMAIL = "igaf@l2.com";
export const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;

export const RESOURCE_CATEGORIES = [
  "Support de cours",
  "Ancien examen",
  "Résumé",
  "Travaux pratiques",
  "Corrigé",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type LibraryResource = {
  id: string;
  title: string;
  course: string;
  category: string;
  file_path: string;
  filename: string;
  mime_type: string;
  created_at: string;
};

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".zip"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
];

export function publicResourceUrl(path: string) {
  return supabase.storage.from(libraryBucket).getPublicUrl(path).data.publicUrl;
}

export function resourceTypeLabel(resource: Pick<LibraryResource, "filename" | "mime_type">) {
  const mime = resource.mime_type.toLowerCase();
  const name = resource.filename.toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) return "DOCX";
  if (name.endsWith(".doc") || mime === "application/msword") return "DOC";
  if (name.endsWith(".pptx") || mime.includes("presentationml")) return "PPTX";
  if (name.endsWith(".ppt") || mime.includes("ms-powerpoint")) return "PPT";
  if (name.endsWith(".zip") || mime.includes("zip")) return "ZIP";
  return "Document";
}

export function isPdfResource(resource: Pick<LibraryResource, "filename" | "mime_type">) {
  return resourceTypeLabel(resource) === "PDF";
}

export function validateResourceFile(file: File | null) {
  if (!file || file.size === 0) return "Aucun fichier n’a été sélectionné.";
  if (file.size > MAX_RESOURCE_BYTES) return "Fichier trop volumineux. La taille maximale est de 25 Mo.";
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Format non accepté. Utilisez un fichier PDF, DOC, DOCX, PPT, PPTX ou ZIP.";
  }
  return null;
}

export async function fetchLibraryResources(): Promise<{ data: LibraryResource[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("id, title, course, category, file_path, filename, mime_type, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      const detail = error.message.toLowerCase();
      if (detail.includes("schema cache") || detail.includes("does not exist")) {
        return { data: [], error: "La table des documents n’est pas encore prête. Exécutez supabase/schema.sql dans l’éditeur SQL de Supabase." };
      }
      return { data: [], error: "Impossible de charger les documents depuis Supabase. Réessayez dans un instant." };
    }
    return { data: (data ?? []) as LibraryResource[], error: null };
  } catch {
    return { data: [], error: "Impossible de charger les documents depuis Supabase. Réessayez dans un instant." };
  }
}

export function frenchSupabaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission") || lower.includes("not authorized")) {
    return "Action non autorisée. Vérifiez que vous êtes connecté avec le compte administrateur.";
  }
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("expired")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Connexion à Supabase impossible. Vérifiez votre réseau puis réessayez.";
  }
  return `Erreur Supabase : ${message}`;
}
