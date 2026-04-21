"use client";

import { FormEvent, useMemo, useState } from "react";

type GraphRecord = Record<string, string>;

type GraphRagResponse = {
  ok: boolean;
  question: string;
  intent: "origin_of_word" | "words_by_language" | "root_of_word" | "unknown";
  detectedWord: string | null;
  detectedLanguage: string | null;
  cypher: string | null;
  answer: string;
  records: GraphRecord[];
  logs: string[];
};

const EXAMPLE_QUESTIONS = [
  "Kata kabar berasal dari bahasa apa?",
  "Tampilkan semua kata dari bahasa Arab",
  "Akar kata dari kantor apa?",
  "Kata gereja berasal dari bahasa apa?",
  "Tampilkan semua kata dari bahasa Belanda",
];

function formatIntentLabel(intent: GraphRagResponse["intent"]) {
  switch (intent) {
    case "origin_of_word":
      return "Origin of Word";
    case "words_by_language":
      return "Words by Language";
    case "root_of_word":
      return "Root of Word";
    default:
      return "Unknown";
  }
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GraphRagResponse | null>(null);

  const recordColumns = useMemo(() => {
    if (!result || result.records.length === 0) return [];
    return Object.keys(result.records[0]);
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Pertanyaan tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/graphrag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Terjadi kesalahan saat memproses pertanyaan.");
      }

      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function fillExample(example: string) {
    setQuestion(example);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">NusaKata</h1>
          <p className="mt-2 text-sm text-slate-600">
            Prototype GraphRAG untuk eksplorasi etimologi bahasa Indonesia.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold">Input Pertanyaan</h2>
            <p className="mt-1 text-sm text-slate-600">
              Gunakan pertanyaan tentang asal bahasa, daftar kata berdasarkan bahasa,
              atau akar kata.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="question" className="mb-2 block text-sm font-medium">
                  Pertanyaan
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder='Contoh: Tampilkan semua kata dari bahasa Arab'
                  className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Memproses..." : "Tanyakan ke NusaKata"}
              </button>
            </form>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium">Contoh cepat</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => fillExample(example)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6 lg:col-span-2">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Jawaban</h2>

              {!result && !loading && (
                <p className="mt-3 text-sm text-slate-500">
                  Hasil akan muncul di sini setelah kamu mengirim pertanyaan.
                </p>
              )}

              {loading && (
                <p className="mt-3 text-sm text-slate-500">
                  Sedang menghubungi backend dan memproses query...
                </p>
              )}

              {result && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Pertanyaan
                    </p>
                    <p className="mt-1 text-sm">{result.question}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Intent
                      </p>
                      <p className="mt-1 text-sm">{formatIntentLabel(result.intent)}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Kata Terdeteksi
                      </p>
                      <p className="mt-1 text-sm">
                        {result.detectedWord ?? "Tidak ada"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Bahasa Terdeteksi
                      </p>
                      <p className="mt-1 text-sm">
                        {result.detectedLanguage ?? "Tidak ada"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Jawaban
                    </p>
                    <p className="mt-2 text-base font-medium">{result.answer}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Cypher</h2>

              {!result?.cypher ? (
                <p className="mt-3 text-sm text-slate-500">
                  Belum ada query untuk ditampilkan.
                </p>
              ) : (
                <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                  <code>{result.cypher}</code>
                </pre>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Records</h2>

              {!result || result.records.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Tidak ada records yang ditampilkan.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {recordColumns.map((column) => (
                          <th
                            key={column}
                            className="px-4 py-3 text-left font-medium text-slate-600"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {result.records.map((record, index) => (
                        <tr key={index}>
                          {recordColumns.map((column) => (
                            <td key={`${index}-${column}`} className="px-4 py-3">
                              {record[column] ?? "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Logs</h2>

              {!result || result.logs.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Belum ada log proses.
                </p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {result.logs.map((log, index) => (
                    <li
                      key={`${log}-${index}`}
                      className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="mr-2 font-semibold text-slate-500">
                        {index + 1}.
                      </span>
                      {log}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}