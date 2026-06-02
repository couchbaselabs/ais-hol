import React, { useState } from 'react'
import './App.css'
import './AppFewShot.css'

const PRESETS = [
  {
    label: 'Sentiment',
    task: 'Classify the sentiment of the text as Positive, Negative, or Neutral.',
    examples: [
      { input: 'I love this product!',          output: 'Positive' },
      { input: 'This is the worst experience.', output: 'Negative' },
      { input: 'It arrived on time.',           output: 'Neutral'  },
    ],
    inputs: [
      'The battery life is incredible.',
      'Meh, it works I guess.',
      'Absolutely terrible customer service.',
    ],
  },
  {
    label: 'SQL generation',
    task: 'Convert the natural language question into a SQL query for a table called "orders" with columns: id, customer, amount, date.',
    examples: [
      { input: 'How many orders are there?',                    output: 'SELECT COUNT(*) FROM orders;' },
      { input: 'What is the total revenue?',                   output: 'SELECT SUM(amount) FROM orders;' },
      { input: 'Show the 5 most recent orders.',               output: 'SELECT * FROM orders ORDER BY date DESC LIMIT 5;' },
    ],
    inputs: [
      'Who placed the largest order?',
      'How many orders were placed this month?',
      'What is the average order value?',
    ],
  },
  {
    label: 'Tone rewriting',
    task: 'Rewrite the text in a formal, professional tone.',
    examples: [
      { input: "Hey, can u send me that file asap?",           output: "Could you please send me that file at your earliest convenience?" },
      { input: "This is super broken, fix it now!",            output: "There appears to be a critical issue that requires immediate attention." },
    ],
    inputs: [
      "lol that meeting was a total waste of time",
      "i dunno, maybe we should just ship it and see what happens",
    ],
  },
]

export default function AppFewShot() {
  const [preset, setPreset] = useState(PRESETS[0])
  const [task, setTask] = useState(PRESETS[0].task)
  const [examples, setExamples] = useState(PRESETS[0].examples)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPreset = (p) => {
    setPreset(p)
    setTask(p.task)
    setExamples(p.examples)
    setInput('')
    setResult(null)
    setError(null)
  }

  const updateExample = (i, field, val) => {
    setExamples(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex))
  }

  const addExample = () => setExamples(prev => [...prev, { input: '', output: '' }])
  const removeExample = (i) => setExamples(prev => prev.filter((_, idx) => idx !== i))

  const run = async (overrideInput) => {
    const inp = overrideInput ?? input
    if (!inp.trim() || !task.trim()) return
    if (overrideInput) setInput(overrideInput)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/few-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, input: inp, examples: examples.filter(e => e.input && e.output) }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app fewshot-app">
      <div className="fewshot-layout">
        {/* Left: configuration */}
        <div className="fewshot-left">
          <div className="fewshot-section">
            <div className="fewshot-section-label">Presets</div>
            <div className="fewshot-presets">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={`fewshot-preset-btn ${preset === p ? 'fewshot-preset-btn--active' : ''}`}
                  onClick={() => loadPreset(p)}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div className="fewshot-section">
            <div className="fewshot-section-label">Task description</div>
            <textarea
              className="fewshot-task-input"
              value={task}
              onChange={e => setTask(e.target.value)}
              rows={3}
            />
          </div>

          <div className="fewshot-section">
            <div className="fewshot-section-label">
              Examples ({examples.length})
              <button className="fewshot-add-btn" onClick={addExample}>+ Add</button>
            </div>
            <div className="fewshot-examples-list">
              {examples.map((ex, i) => (
                <div key={i} className="fewshot-example-row">
                  <input
                    className="fewshot-ex-input"
                    placeholder="Input"
                    value={ex.input}
                    onChange={e => updateExample(i, 'input', e.target.value)}
                  />
                  <span className="fewshot-arrow">→</span>
                  <input
                    className="fewshot-ex-output"
                    placeholder="Expected output"
                    value={ex.output}
                    onChange={e => updateExample(i, 'output', e.target.value)}
                  />
                  <button className="fewshot-remove-btn" onClick={() => removeExample(i)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: run */}
        <div className="fewshot-right">
          <div className="fewshot-section">
            <div className="fewshot-section-label">Test input</div>
            <div className="fewshot-run-row">
              <input
                className="fewshot-run-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder="Enter a new input to classify / transform…"
              />
              <button
                className="fewshot-run-btn"
                onClick={() => run()}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? 'Running…' : 'Compare →'}
              </button>
            </div>
            {preset.inputs && (
              <div className="fewshot-input-examples">
                {preset.inputs.map((ex, i) => (
                  <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="fewshot-error">{error}</div>}
          {isLoading && <div className="fewshot-loading">Running zero-shot and few-shot in parallel…</div>}

          {result && (
            <div className="fewshot-results">
              <div className="fewshot-result-card fewshot-result-card--zero">
                <div className="fewshot-result-header">
                  <span className="fewshot-result-label">Zero-shot</span>
                  <span className="fewshot-result-meta">0 examples · {result.zero_shot.latency_s}s · {result.zero_shot.tokens} tokens</span>
                </div>
                <p className="fewshot-result-text">{result.zero_shot.response}</p>
              </div>
              <div className="fewshot-result-card fewshot-result-card--few">
                <div className="fewshot-result-header">
                  <span className="fewshot-result-label">Few-shot</span>
                  <span className="fewshot-result-meta">{result.few_shot.shots} examples · {result.few_shot.latency_s}s · {result.few_shot.tokens} tokens</span>
                </div>
                <p className="fewshot-result-text">{result.few_shot.response}</p>
              </div>
            </div>
          )}

          {!result && !isLoading && (
            <div className="fewshot-placeholder">
              The same input is sent twice — once with no examples (zero-shot) and once
              with the examples above (few-shot). Compare how examples steer the output.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
