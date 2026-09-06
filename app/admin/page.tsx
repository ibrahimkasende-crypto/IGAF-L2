/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, LoaderCircle, LockKeyhole, LogOut, Pencil, Trash2, UploadCloud } from "lucide-react";
import students from "../data/students.json";
import { baseCourse } from "../lib/igaf";
import {
  ADMIN_EMAIL,
  fetchLibraryResources,
  frenchSupabaseError,
  libraryBucket,
  publicResourceUrl,
  RESOURCE_CATEGORIES,
  resourceTypeLabel,
  supabase,
  validateResourceFile,
  type LibraryResource,
} from "../lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SiteFooter from "../ui/site-footer";
import SafeImg from "../ui/safe-img";

type Notice = { kind: "ok" | "error"; text: string } | null;

export default function Admin() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [toDelete, setToDelete] = useState<LibraryResource | null>(null);
  const [toEdit, setToEdit] = useState<LibraryResource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editCategory, setEditCategory] = useState<string>(RESOURCE_CATEGORIES[0]);
  const logoutRef = useRef(false);
  const courses = useMemo(
    () => Array.from(new Set(students.flatMap((s) => [...s.semester3, ...s.semester4]).map(baseCourse))).filter((c) => c !== "Aucun").sort(),
    [],
  );

  const load = async () => {
    setLibraryLoading(true);
    const result = await fetchLibraryResources();
    setResources(result.data);
    setLibraryError(result.error);
    setLibraryLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setLogged(!!data.session);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const active = !!session;
      setLogged(active);
      setSessionReady(true);
      if (event === "SIGNED_OUT" && !logoutRef.current) {
        setNotice({ kind: "error", text: "Votre session a expiré. Veuillez vous reconnecter." });
      }
      if (event === "SIGNED_OUT") logoutRef.current = false;
    });
    void load();
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setLogged(false);
      setNotice({ kind: "error", text: "Adresse e-mail ou mot de passe incorrect." });
      return;
    }
    setLogged(true);
    setPassword("");
    setNotice(null);
    await load();
  };

  const logout = async () => {
    logoutRef.current = true;
    await supabase.auth.signOut();
    setLogged(false);
    setPassword("");
    setNotice(null);
    setToDelete(null);
    setToEdit(null);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File | null;
    const invalid = validateResourceFile(file);
    if (invalid || !file) {
      setNotice({ kind: "error", text: invalid ?? "Aucun fichier n’a été sélectionné." });
      return;
    }
    setBusy(true);
    setNotice(null);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${Date.now()}-${crypto.randomUUID()}-${safe}`;
    const upload = await supabase.storage.from(libraryBucket).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upload.error) {
      setNotice({ kind: "error", text: frenchSupabaseError(upload.error.message) });
      setBusy(false);
      return;
    }
    const insert = await supabase.from("resources").insert({
      title: String(data.get("title")).trim(),
      course: String(data.get("course")),
      category: String(data.get("category")),
      file_path: path,
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
    });
    if (insert.error) {
      await supabase.storage.from(libraryBucket).remove([path]);
      setNotice({ kind: "error", text: frenchSupabaseError(insert.error.message) });
    } else {
      setNotice({ kind: "ok", text: "Document ajouté à la bibliothèque." });
      form.reset();
      await load();
    }
    setBusy(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEdit) return;
    setBusy(true);
    const { error } = await supabase
      .from("resources")
      .update({ title: editTitle.trim(), course: editCourse, category: editCategory })
      .eq("id", toEdit.id);
    if (error) {
      setNotice({ kind: "error", text: frenchSupabaseError(error.message) });
    } else {
      setNotice({ kind: "ok", text: "Document modifié." });
      setToEdit(null);
      await load();
    }
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    const storage = await supabase.storage.from(libraryBucket).remove([toDelete.file_path]);
    if (storage.error) {
      setNotice({ kind: "error", text: frenchSupabaseError(storage.error.message) });
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("resources").delete().eq("id", toDelete.id);
    if (error) {
      setNotice({ kind: "error", text: frenchSupabaseError(error.message) });
    } else {
      setNotice({ kind: "ok", text: "Document supprimé." });
      setToDelete(null);
      await load();
    }
    setBusy(false);
  };

  const openEdit = (resource: LibraryResource) => {
    setToEdit(resource);
    setEditTitle(resource.title);
    setEditCourse(resource.course);
    setEditCategory(resource.category);
  };

  return (
    <div className="mesh flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0879b7]">
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
          <section className="rounded-[2rem] border bg-white p-5 shadow-xl md:p-8">
            <div className="flex items-center gap-3">
              <SafeImg src="/logo-l2.jpeg" alt="Logo IGAF" width={58} height={58} className="h-[58px] w-[58px] rounded-full bg-white object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0879b7]">IGAF L2</p>
                <h1 className="text-2xl font-black">Administration</h1>
              </div>
              {sessionReady && logged && (
                <button onClick={logout} className="rounded-xl bg-slate-100 p-3" title="Se déconnecter">
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>

            {!sessionReady ? (
              <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 p-8 text-sm font-semibold text-[#0879b7]">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Vérification de la session…
              </div>
            ) : !logged ? (
              <form onSubmit={login} className="mx-auto mt-8 max-w-md space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5 text-center">
                  <LockKeyhole className="mx-auto h-8 w-8 text-[#0879b7]" />
                  <b className="mt-2 block">Connexion administrateur</b>
                  <p className="mt-1 text-sm text-slate-500">Utilisez le compte créé dans Supabase Authentication.</p>
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Adresse e-mail"
                  className="h-12 w-full rounded-xl border px-3 outline-none focus:ring-2"
                />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="h-12 w-full rounded-xl border px-3 outline-none focus:ring-2"
                />
                <button disabled={busy} className="h-12 w-full rounded-xl bg-[#0879b7] font-bold text-white disabled:opacity-50">
                  {busy ? "Connexion…" : "Se connecter"}
                </button>
                {notice && (
                  <p className={`rounded-xl p-3 text-sm ${notice.kind === "error" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-800"}`}>
                    {notice.text}
                  </p>
                )}
              </form>
            ) : (
              <>
                <form onSubmit={submit} className="mt-7 grid gap-4">
                  <div>
                    <label className="text-sm font-bold">Titre du document</label>
                    <input name="title" required className="mt-2 h-12 w-full rounded-xl border px-3 outline-none focus:ring-2" placeholder="Ex. Ancien examen — Base de données" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-bold">Cours</label>
                      <select name="course" required className="mt-2 h-12 w-full rounded-xl border bg-white px-3">
                        <option value="">Sélectionner</option>
                        {courses.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold">Catégorie</label>
                      <select name="category" className="mt-2 h-12 w-full rounded-xl border bg-white px-3">
                        {RESOURCE_CATEGORIES.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-7 text-center">
                    <UploadCloud className="h-8 w-8 text-[#0879b7]" />
                    <b className="mt-2">Choisir le PDF ou le document</b>
                    <span className="text-sm text-slate-500">PDF, DOC, DOCX, PPT, PPTX ou ZIP · 25 Mo maximum</span>
                    <input name="file" required type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,application/pdf" className="mt-3 max-w-full text-sm" />
                  </label>
                  <button disabled={busy} className="flex h-13 items-center justify-center gap-2 rounded-xl bg-[#0879b7] font-bold text-white disabled:opacity-50">
                    {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                    {busy ? "Envoi en cours…" : "Ajouter à la bibliothèque"}
                  </button>
                  {notice && (
                    <p className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${notice.kind === "ok" ? "bg-sky-50 text-sky-800" : "bg-rose-50 text-rose-700"}`}>
                      {notice.kind === "ok" && <CheckCircle2 className="h-5 w-5" />}
                      {notice.text}
                    </p>
                  )}
                </form>

                <div className="mt-9">
                  <h2 className="text-lg font-black">Documents publiés ({resources.length})</h2>
                  {libraryLoading && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-[#0879b7]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Chargement des documents…
                    </div>
                  )}
                  {libraryError && <p className="mt-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{libraryError}</p>}
                  <div className="mt-3 space-y-2">
                    {!libraryLoading && !libraryError && resources.length === 0 && (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun document publié.</p>
                    )}
                    {resources.map((r) => (
                      <div key={r.id} className="rounded-xl border p-3">
                        <div className="min-w-0">
                          <b className="block truncate text-sm">{r.title}</b>
                          <span className="text-xs text-slate-500">
                            {r.course} · {r.category} · {resourceTypeLabel(r)} ·{" "}
                            {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={publicResourceUrl(r.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ouvrir
                          </a>
                          <button onClick={() => openEdit(r)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </button>
                          <button onClick={() => setToDelete(r)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce document ?</DialogTitle>
            <DialogDescription>
              {toDelete ? `« ${toDelete.title} » sera retiré de la bibliothèque et du stockage. Cette action est définitive.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => setToDelete(null)} className="rounded-xl bg-slate-100 p-3 font-bold">
              Annuler
            </button>
            <button onClick={confirmDelete} disabled={busy} className="rounded-xl bg-rose-600 p-3 font-bold text-white disabled:opacity-50">
              {busy ? "Suppression…" : "Confirmer la suppression"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toEdit} onOpenChange={(open) => !open && setToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
            <DialogDescription>Le fichier lui-même n’est pas remplacé.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="grid gap-3">
            <div>
              <label className="text-sm font-bold">Titre</label>
              <input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3 outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-sm font-bold">Cours</label>
              <select required value={editCourse} onChange={(e) => setEditCourse(e.target.value)} className="mt-2 h-12 w-full rounded-xl border bg-white px-3">
                {courses.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                {editCourse && !courses.includes(editCourse) && <option>{editCourse}</option>}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold">Catégorie</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-2 h-12 w-full rounded-xl border bg-white px-3">
                {RESOURCE_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
                {editCategory && !RESOURCE_CATEGORIES.includes(editCategory as (typeof RESOURCE_CATEGORIES)[number]) && <option>{editCategory}</option>}
              </select>
            </div>
            <button disabled={busy} className="h-12 rounded-xl bg-[#0879b7] font-bold text-white disabled:opacity-50">
              {busy ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
