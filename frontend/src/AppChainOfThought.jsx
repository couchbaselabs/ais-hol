import React, { useState } from 'react'
import './App.css'
import './AppChainOfThought.css'

const EXAMPLES = [
  { label: 'Logic', q: 'If all Bloops are Razzles and all Razzles are Lazzles, are all Bloops definitely Lazzles?' },
  { label: 'Maths', q: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?' },
  { label: 'Maths', q: 'If you have 3 apples and you take away 2, how many apples do you have?' },
  { label: 'Reasoning', q: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?' },
  { label: 'Coding', q: 'What does this Python code return: [x*2 for x in range(5) if x % 2 == 0]?' },
  { label: 'Probability', q: 'I flip a fair coin twice. What is the probability of getting at least one head?' },
]

export default function AppChainOfThought() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrideQ) => {
    const q = overrideQ ?? question
    if (!q.trim()) return
    if (overrideQ) setQuestion(overrideQ)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/chain-of-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Try to split CoT response into reasoning + answer
  const splitCoT = (text) => {
    if (!text) return { reasoning: '', answer: text }
    // Look for common answer-delimiter patterns
    const patterns = [
      /\n\n(the answer is[:\s].+)/is,
      /\n\n(therefore[,:\s].+)/is,
      /\n\n(so[,:\s].+)/is,
      /\n\n(final answer[:\s].+)/is,
      /\n\n(\*\*answer\*\*[:\s].+)/is,
    ]
    for (const pat of patterns) {
      const m = text.match(pat)
      if (m) {
        return {
          reasoning: text.slice(0, m.index).trim(),
          answer: m[1].trim(),
        }
      }
    }
    // Fallback: last paragraph is the answer
    const parts = text.trim().split(/\n\n+/)
    if (parts.length > 1) {
      return { reasoning: parts.slice(0, -1).join('\n\n'), answer: parts[parts.length - 1] }
    }
    return { reasoning: '', answer: text }
  }

  const cot = result ? splitCoT(result.chain_of_thought.response) : null

  return (
    <div className="app cot-app">
      <div className="cot-controls">
        <div className="cot-query-row">
          <input
            className="cot-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask a reasoning, maths, or logic question…"
          />
          <button
            className="cot-run-btn"
            onClick={() => run()}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Running…' : 'Compare →'}
          </button>
        </div>
        <div className="cot-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex.q)}>
              <span className="cot-ex-label">{ex.label}</span> {ex.q.length > 55 ? ex.q.slice(0, 55) + '…' : ex.q}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="cot-error">{error}</div>}
      {isLoading && <div className="cot-loading">Running direct and chain-of-thought in parallel…</div>}

      {result && (
        <div className="cot-results">
          {/* Direct */}
          <div className="cot-card cot-card--direct">
            <div className="cot-card-header">
              <span className="cot-card-title">Direct answer</span>
              <span className="cot-card-meta">
                {result.direct.latency_s}s · {result.direct.tokens} tokens
              </span>
            </div>
            <div className="cot-card-system">
              System: <em>"Answer directly and concisely. Give only the final answer."</em>
            </div>
            <p className="cot-card-response">{result.direct.response}</p>
          </div>

          {/* Chain-of-thought */}
          <div className="cot-card cot-card--cot">
            <div className="cot-card-header">
              <span className="cot-card-title">Chain-of-thought</span>
              <span className="cot-card-meta">
                {result.chain_of_thought.latency_s}s · {result.chain_of_thought.tokens} tokens
              </span>
            </div>
            <div className="cot-card-system">
              System: <em>"Think step by step before giving your final answer."</em>
            </div>

            {cot.reasoning ? (
              <>
                <div className="cot-reasoning-label">Reasoning</div>
                <p className="cot-reasoning">{cot.reasoning}</p>
                <div className="cot-answer-label">Answer</div>
                <p className="cot-answer">{cot.answer}</p>
              </>
            ) : (
              <p className="cot-card-response">{result.chain_of_thought.response}</p>
            )}
          </div>

          {/* Delta */}
          <div className="cot-delta">
            <span className="cot-delta-label">Token overhead</span>
            <span className="cot-delta-val">
              +{result.chain_of_thought.tokens - result.direct.tokens} tokens
              ({((result.chain_of_thought.tokens / Math.max(result.direct.tokens, 1) - 1) * 100).toFixed(0)}% more)
            </span>
            <span className="cot-delta-label" style={{ marginLeft: '1.5rem' }}>Latency overhead</span>
            <span className="cot-delta-val">
              +{(result.chain_of_thought.latency_s - result.direct.latency_s).toFixed(2)}s
            </span>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="cot-placeholder">
          Chain-of-thought prompting asks the model to show its reasoning before answering.
          For logic, maths, and multi-step problems it dramatically improves accuracy —
          at the cost of more tokens and slightly higher latency.
        </div>
      )}
    </div>
  )
}
