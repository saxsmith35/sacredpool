'use client'

import { useState, useEffect, useCallback } from 'react'

interface Priest {
  id: string; name: string; phone_number: string; ordination_date: string | null
  times_served: number; is_active: boolean; last_served_date: string | null
}
interface Schedule {
  id: string; service_date: string; priest_ids: string[]; status: string
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const colors = status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors}`}>{status}</span>
}

export default function Dashboard() {
  const [priests, setPriests] = useState<Priest[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState({ name: '', phone_number: '', ordination_date: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([fetch('/api/priests'), fetch('/api/schedules')])
    setPriests(await pRes.json())
    setSchedules(await sRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const currentSchedule = schedules[0]
  const confirmedPriests = currentSchedule
    ? priests.filter(p => currentSchedule.priest_ids?.includes(p.id))
    : []

  async function savePriest() {
    const method = editingId ? 'PUT' : 'POST'
    const body = editingId ? { id: editingId, ...form } : form
    await fetch('/api/priests', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ name: '', phone_number: '', ordination_date: '' })
    setEditingId(null)
    setShowModal(false)
    fetchData()
  }

  async function removePriest(id: string) {
    if (!confirm('Remove this priest from the active roster?')) return
    await fetch('/api/priests', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchData()
  }

  function editPriest(p: Priest) {
    setForm({ name: p.name, phone_number: p.phone_number, ordination_date: p.ordination_date || '' })
    setEditingId(p.id)
    setShowModal(true)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-400 text-lg">Loading...</div></div>

  const activePriests = priests.filter(p => p.is_active)
  const isFirstMonday = new Date().getDate() <= 7 && new Date().getDay() === 1

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-900">⛪ SacredPool</h1>
          <p className="text-sm text-slate-500">Sacrament Blessing Scheduler</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isFirstMonday && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            📋 Monthly roster review — please check that all priests are up to date.
          </div>
        )}

        {/* Current Week */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-3">
            {currentSchedule ? `This Sunday (${formatDate(currentSchedule.service_date)})` : 'No Upcoming Schedule'}
          </h2>
          {currentSchedule && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={currentSchedule.status} />
                <span className="text-sm text-slate-500">{currentSchedule.priest_ids?.length || 0}/3 confirmed</span>
              </div>
              {confirmedPriests.length > 0 ? confirmedPriests.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">✓</div>
                  <div>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.phone_number}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-400 italic">No priests confirmed yet</p>
              )}
              {currentSchedule.status === 'in_progress' && Array.from({ length: 3 - confirmedPriests.length }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white text-sm">⏳</div>
                  <p className="text-sm text-slate-500 italic">Awaiting response...</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Queue */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Priest Roster ({activePriests.length})</h2>
            <button
              onClick={() => { setEditingId(null); setForm({ name: '', phone_number: '', ordination_date: '' }); setShowModal(true) }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] active:bg-blue-700"
            >+ Add Priest</button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activePriests.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      Last: {p.last_served_date ? formatDate(p.last_served_date) : 'Never'} · Served {p.times_served}x
                      {p.ordination_date && ` · Ordained ${formatDate(p.ordination_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editPriest(p)} className="p-2 text-slate-400 hover:text-blue-600 min-w-[44px] min-h-[44px] flex items-center justify-center">✏️</button>
                  <button onClick={() => removePriest(p.id)} className="p-2 text-slate-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center">🗑️</button>
                </div>
              </div>
            ))}
            {activePriests.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No priests added yet</p>}
          </div>
        </section>

        {/* History */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex items-center justify-between min-h-[44px]">
            <h2 className="font-semibold text-slate-900">Past Services</h2>
            <span className="text-slate-400">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {schedules.slice(1).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">{formatDate(s.service_date)}</span>
                  <div className="flex gap-1">
                    {priests.filter(p => s.priest_ids?.includes(p.id)).map(p => (
                      <span key={p.id} className="text-xs bg-slate-200 px-2 py-1 rounded">{p.name}</span>
                    ))}
                  </div>
                </div>
              ))}
              {schedules.length <= 1 && <p className="text-sm text-slate-400 text-center py-2">No past services</p>}
            </div>
          )}
        </section>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Priest' : 'Add Priest'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base" placeholder="+12345678901" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordination Date</label>
                <input type="date" value={form.ordination_date} onChange={e => setForm({ ...form, ordination_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base" />
                {!form.ordination_date && <p className="text-xs text-amber-600 mt-1">⚠️ Ordination date not set</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-medium min-h-[44px]">Cancel</button>
                <button onClick={savePriest} disabled={!form.name || !form.phone_number}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium min-h-[44px] disabled:opacity-50 active:bg-blue-700">
                  {editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
