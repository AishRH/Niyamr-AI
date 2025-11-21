import React, { useState, useRef } from 'react'
import axios from 'axios'

export default function App() {
  const [file, setFile] = useState(null)
  const [rule1, setRule1] = useState('')
  const [rule2, setRule2] = useState('')
  const [rule3, setRule3] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (f) => {
    setFile(f)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please upload a PDF (2–10 pages)'); return }
    setError('')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('pdf', file)
      form.append('rule1', rule1)
      form.append('rule2', rule2)
      form.append('rule3', rule3)

      const resp = await axios.post('http://localhost:8000/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setResults(resp.data)
      setCopied(false)
    } catch (err) {
      console.error(err?.response?.data || err.message)
      setError(err?.response?.data?.error || err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResults = async () => {
    if (!results) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2))
      setCopied(true)
      // auto-hide toast after 2s
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('copy failed', e)
      setError('Copy failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-start py-12 px-4">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">NIYAMR AI</h1>
            <p className="text-sm text-slate-500">PDF Rule Checker — fast, visual & explainable</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">v1.2</span>
            <button className="px-3 py-2 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-md text-sm shadow-sm hover:scale-105 transform transition">Help</button>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-md border border-slate-100 space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload PDF (2–10 pages)</label>

              <div
                onDrop={handleDrop}
                onDragOver={(e)=> e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:bg-slate-50 transition flex flex-col items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM14 14v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1c0-2.21 2.686-4 6-4s6 1.79 6 4z" />
                </svg>
                <div className="text-sm text-slate-500">Drag & drop a PDF here, or click to browse</div>
                <div className="text-xs text-slate-400">Only <strong>.pdf</strong> — recommended 2 to 10 pages</div>
                {file && (
                  <div className="absolute left-4 top-4 flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">{file.name}</span>
                    <button type="button" onClick={(ev)=>{ev.stopPropagation(); setFile(null)}} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}

                <input ref={fileInputRef} onChange={(e)=> handleFile(e.target.files?.[0])} type="file" accept="application/pdf" className="hidden" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Rules (custom)</label>
              <input value={rule1} onChange={e=>setRule1(e.target.value)} placeholder="Rule 1 — e.g. Document must contain a purpose section" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
              <input value={rule2} onChange={e=>setRule2(e.target.value)} placeholder="Rule 2 — e.g. Must mention at least one date" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
              <input value={rule3} onChange={e=>setRule3(e.target.value)} placeholder="Rule 3 — e.g. Define at least one term" className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button disabled={loading} type="submit" className="flex-1 inline-flex items-center justify-center gap-3 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium shadow hover:scale-[1.02] active:scale-100 transform transition">
                {loading ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" d="M4 12a8 8 0 018-8v8z" fill="currentColor"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v1H2V5z"/><path d="M2 9h14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z"/></svg>
                )}
                <span>{loading ? 'Checking...' : 'Check Document'}</span>
              </button>

              <button type="button" onClick={()=>{setRule1(''); setRule2(''); setRule3(''); setFile(null); setResults(null); setError('')}} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition">Reset</button>
            </div>

            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

            <footer className="text-xs text-slate-400 pt-3">Tip: use concise rules. The checker returns evidence, reasoning and a confidence score.</footer>
          </form>

          <section>
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 min-h-[240px]">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Results</h2>

              {!results && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-indigo-200" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v1H2V5zM2 9h14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z"/></svg>
                  <div className="text-sm">No results yet — upload a PDF and click <span className="font-medium">Check Document</span>.</div>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">Pages: <span className="font-medium text-slate-700">{results.meta?.pagesCount ?? '—'}</span></div>
                    <div className="text-sm text-slate-500">Model: <span className="font-medium text-slate-700">{results.meta?.model ?? 'local'}</span></div>
                  </div>

                  {Array.isArray(results.result) ? (
                    <div className="space-y-3 overflow-x-auto">
                      <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="text-sm text-slate-500 text-left">
                            <th className="pb-2">Rule</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Evidence</th>
                            <th className="pb-2">Reasoning</th>
                            <th className="pb-2">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.result.map((r, i) => (
                            <tr key={i} className="align-top border-t border-slate-100 hover:bg-slate-50 transition">
                              <td className="py-3 pr-4 w-1/4">
                                <div className="text-sm font-medium text-slate-800">{r.rule}</div>
                                <div className="text-xs text-slate-400">rule #{i+1}</div>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'PASS' ? 'bg-emerald-50 text-emerald-700' : r.status === 'FAIL' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{r.status}</span>
                              </td>
                              <td className="py-3 pr-4 text-sm text-slate-700 max-w-xs">
                                <div>{String(r.evidence)}</div>
                              </td>
                              <td className="py-3 pr-4 text-sm text-slate-600">{r.reasoning}</td>
                              <td className="py-3 pr-4 w-36">
                                <div className="text-sm">{(r.confidence ?? 0).toFixed ? (Number(r.confidence).toFixed(2)) : String(r.confidence)}</div>
                                <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                  <div style={{ width: `${Math.min(100, (Number(r.confidence) || 0) * 100)}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="bg-slate-50 p-4 rounded-md text-sm text-slate-700 overflow-auto">{JSON.stringify(results.result, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={handleCopyResults} className="rounded-lg px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition text-sm">Copy Results</button>
            </div>

            {copied && (
  <div className="fixed bottom-6 right-6 bg-slate-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
    Copied!
  </div>
)}
          </section>
        </main>
      </div>
    </div>
  )
}
