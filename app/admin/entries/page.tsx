"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type RelationType = "DERIVED_FROM" | "BORROWED_FROM" | "COGNATE_WITH";

type EtymologyEntry = {
  lemma: string;
  meaning: string;
  rootForm: string;
  originLanguage: string;
  relationType: RelationType;
  gloss: string;
  languageFamily: string;
  historicalPeriod: string;
  notes: string;
  sourceReference: string;
};

type EntriesResponse = {
  ok: boolean;
  data: EtymologyEntry[];
  message?: string;
};

const EMPTY_FORM: EtymologyEntry = {
  lemma: "",
  meaning: "",
  rootForm: "",
  originLanguage: "",
  relationType: "DERIVED_FROM",
  gloss: "",
  languageFamily: "",
  historicalPeriod: "",
  notes: "",
  sourceReference: "",
};

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<EtymologyEntry[]>([]);
  const [form, setForm] = useState<EtymologyEntry>(EMPTY_FORM);
  const [editingLemma, setEditingLemma] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setFetching(true);
    setError(null);

    try {
      const response = await fetch("/api/entries");
      const data: EntriesResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Gagal mengambil data entri.");
      }

      setEntries(data.data);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data.";
      setError(msg);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEntries();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadEntries]);

  function updateField<K extends keyof EtymologyEntry>(
    key: K,
    value: EtymologyEntry[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleEdit(entry: EtymologyEntry) {
    setForm(entry);
    setEditingLemma(entry.lemma);
    setMessage(`Mode edit aktif untuk lemma "${entry.lemma}".`);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingLemma(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const isEdit = Boolean(editingLemma);
      const url = isEdit ? `/api/entries/${editingLemma}` : "/api/entries";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Operasi gagal dilakukan.");
      }

      setMessage(
        isEdit
          ? `Entri "${form.lemma}" berhasil diperbarui.`
          : `Entri "${form.lemma}" berhasil ditambahkan.`
      );

      resetForm();
      await loadEntries();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(lemma: string) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus entri "${lemma}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/entries/${lemma}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Gagal menghapus entri.");
      }

      if (editingLemma === lemma) {
        resetForm();
      }

      setMessage(`Entri "${lemma}" berhasil dihapus.`);
      await loadEntries();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Etymology Entries
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Halaman ini digunakan untuk mengelola entri etimologi di NusaKata.
          </p>
        </div>

        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {editingLemma ? "Edit Entry" : "Tambah Entry"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Komponen utama wajib diisi, komponen tambahan bersifat opsional.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Komponen Utama
                </h3>

                <div className="space-y-4">
                  <InputField
                    label="Lemma"
                    value={form.lemma}
                    onChange={(value) => updateField("lemma", value)}
                    placeholder="contoh: kantor"
                  />

                  <InputField
                    label="Meaning"
                    value={form.meaning}
                    onChange={(value) => updateField("meaning", value)}
                    placeholder="contoh: tempat bekerja atau instansi"
                  />

                  <InputField
                    label="Root Form"
                    value={form.rootForm}
                    onChange={(value) => updateField("rootForm", value)}
                    placeholder="contoh: kantoor"
                  />

                  <InputField
                    label="Origin Language"
                    value={form.originLanguage}
                    onChange={(value) => updateField("originLanguage", value)}
                    placeholder="contoh: Belanda"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Relation Type
                    </label>
                    <select
                      value={form.relationType}
                      onChange={(e) =>
                        updateField(
                          "relationType",
                          e.target.value as RelationType
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="DERIVED_FROM">DERIVED_FROM</option>
                      <option value="BORROWED_FROM">BORROWED_FROM</option>
                      <option value="COGNATE_WITH">COGNATE_WITH</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Komponen Tambahan
                </h3>

                <div className="space-y-4">
                  <InputField
                    label="Gloss"
                    value={form.gloss}
                    onChange={(value) => updateField("gloss", value)}
                    placeholder="contoh: office"
                  />

                  <InputField
                    label="Language Family"
                    value={form.languageFamily}
                    onChange={(value) => updateField("languageFamily", value)}
                    placeholder="contoh: Indo-Eropa"
                  />

                  <InputField
                    label="Historical Period"
                    value={form.historicalPeriod}
                    onChange={(value) =>
                      updateField("historicalPeriod", value)
                    }
                    placeholder="contoh: masa kolonial"
                  />

                  <InputField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="catatan tambahan etimologis"
                  />

                  <InputField
                    label="Source Reference"
                    value={form.sourceReference}
                    onChange={(value) => updateField("sourceReference", value)}
                    placeholder="contoh: Kamus Etimologi Bahasa Indonesia"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Memproses..."
                    : editingLemma
                    ? "Simpan Perubahan"
                    : "Tambah Entry"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Daftar Entry</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Data etimologi yang saat ini tersimpan di Neo4j.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadEntries()}
                disabled={fetching || loading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {fetching ? "Loading..." : "Refresh"}
              </button>
            </div>

            {fetching ? (
              <p className="text-sm text-slate-500">
                Sedang memuat data entri...
              </p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada entri.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHead>Lemma</TableHead>
                        <TableHead>Root Form</TableHead>
                        <TableHead>Relation</TableHead>
                        <TableHead>Origin Language</TableHead>
                        <TableHead>Meaning</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Actions</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {entries.map((entry) => (
                        <tr key={entry.lemma}>
                          <TableCell>{entry.lemma}</TableCell>
                          <TableCell>{entry.rootForm}</TableCell>
                          <TableCell>{entry.relationType}</TableCell>
                          <TableCell>{entry.originLanguage}</TableCell>
                          <TableCell>{entry.meaning}</TableCell>
                          <TableCell>{entry.historicalPeriod || "-"}</TableCell>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(entry)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(entry.lemma)}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-medium text-slate-600">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}