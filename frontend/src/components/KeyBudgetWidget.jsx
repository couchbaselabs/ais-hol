import React, { useState, useEffect } from 'react'
import './KeyBudgetWidget.css'

const POLL_MS = 60_000

function formatMoney(n) {
  if (typeof n !== 'number') return '?'
  return `$${n.toFixed(2)}`
}

function formatResetIn(resetAtIso) {
  if (!resetAtIso) return null
  const resetAt = new Date(resetAtIso).getTime()
  if (Number.isNaN(resetAt)) return null
  const diffMs = resetAt - Date.now()
  if (diffMs <= 0) return 'resets shortly'
  const totalMin = Math.round(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`
}

export default function KeyBudgetWidget() {
  const [info, setInfo] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | error
  const [, setTick] = useState(0) // forces re-render so the countdown stays fresh

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/litellm/key-info')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setInfo(data)
          setStatus('ok')
        }
      } catch (e) {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    const poll = setInterval(load, POLL_MS)
    const countdown = setInterval(() => setTick(t => t + 1), 30_000)
    return () => {
      cancelled = true
      clearInterval(poll)
      clearInterval(countdown)
    }
  }, [])

  if (status === 'loading') {
    return <div className="key-budget key-budget--loading">Loading budget…</div>
  }

  if (status === 'error' || !info || typeof info.max_budget !== 'number') {
    return (
      <div className="key-budget key-budget--error" title="Could not reach the LiteLLM proxy for this key">
        Budget unavailable
      </div>
    )
  }

  const { max_budget, remaining, key_alias } = info
  const pct = max_budget > 0 ? Math.max(0, Math.min(1, remaining / max_budget)) : 0
  const level = pct > 0.5 ? 'high' : pct > 0.2 ? 'mid' : 'low'
  const resetLabel = formatResetIn(info.budget_reset_at)

  return (
    <div
      className={`key-budget key-budget--${level}`}
      title={key_alias ? `Virtual key: ${key_alias}` : undefined}
    >
      <span className="key-budget-dot" />
      <span className="key-budget-amounts">
        {formatMoney(remaining)} / {formatMoney(max_budget)} left
      </span>
      {resetLabel && <span className="key-budget-reset">· {resetLabel}</span>}
    </div>
  )
}
