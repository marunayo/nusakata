"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type EtymologyEntry = {
  word: string;
  meaning: string;
  rootForm: string;
  gloss: string;
  originLanguage: string;
  languageFamily: string;
};

type EntriesResponse = {
  ok: boolean;
  data: EtymologyEntry[];
  message?: string;
};

const EMPTY_FORM: EtymologyEntry = {
  word: "",
  meaning: "",
  rootForm: "",
  gloss: "",
  originLanguage: "",
  languageFamily: "",
};

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<EtymologyEntry[]>([]);
  const [form, setForm] = useState<EtymologyEntry>(EMPTY_FORM);
  const [editingWord, setEditingWord] = useState<string | null>(null);
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
    setEditingWord(entry.word);
    setMessage(`Mode edit aktif untuk kata "${entry.word}".`);
    setError(null);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingWord(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const isEdit = Boolean(editingWord);
      const url = isEdit ? `/api/entries/${editingWord}` : "/api/entries";
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
          ? `Entri "${form.word}" berhasil diperbarui.`
          : `Entri "${form.word}" berhasil ditambahkan.`
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

  async function handleDelete(word: string) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus entri "${word}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/entries/${word}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Gagal menghapus entri.");
      }

      if (editingWord === word) {
        resetForm();
      }

      setMessage(`Entri "${word}" berhasil dihapus.`);
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
            Halaman ini digunakan untuk menambah, melihat, mengubah, dan
            menghapus entri etimologi di NusaKata.
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
                {editingWord ? "Edit Entry" : "Tambah Entry"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Isi data kata, root form, dan bahasa asalnya.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Word"
                value={form.word}
                onChange={(value) => updateField("word", value)}
                placeholder="contoh: kantor"
              />

              <InputField
                label="Meaning"
                value={form.meaning}
                onChange={(value) => updateField("meaning", value)}
                placeholder="contoh: tempat kerja administratif"
              />

              <InputField
                label="Root Form"
                value={form.rootForm}
                onChange={(value) => updateField("rootForm", value)}
                placeholder="contoh: kantoor"
              />

              <InputField
                label="Gloss"
                value={form.gloss}
                onChange={(value) => updateField("gloss", value)}
                placeholder="contoh: office"
              />

              <InputField
                label="Origin Language"
                value={form.originLanguage}
                onChange={(value) => updateField("originLanguage", value)}
                placeholder="contoh: Belanda"
              />

              <InputField
                label="Language Family"
                value={form.languageFamily}
                onChange={(value) => updateField("languageFamily", value)}
                placeholder="contoh: Indo-Eropa"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Memproses..."
                    : editingWord
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
                        <TableHead>Word</TableHead>
                        <TableHead>Root Form</TableHead>
                        <TableHead>Origin Language</TableHead>
                        <TableHead>Meaning</TableHead>
                        <TableHead>Gloss</TableHead>
                        <TableHead>Family</TableHead>
                        <TableHead>Actions</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {entries.map((entry) => (
                        <tr key={entry.word}>
                          <TableCell>{entry.word}</TableCell>
                          <TableCell>{entry.rootForm}</TableCell>
                          <TableCell>{entry.originLanguage}</TableCell>
                          <TableCell>{entry.meaning || "-"}</TableCell>
                          <TableCell>{entry.gloss || "-"}</TableCell>
                          <TableCell>{entry.languageFamily || "-"}</TableCell>
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
                                onClick={() => void handleDelete(entry.word)}
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