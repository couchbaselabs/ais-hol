import React, { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import './CodeBlock.css'

/**
 * Syntax-highlighted code block with a copy button and an optional title.
 *
 * Props:
 *   code     {string}  — source code to display
 *   language {string}  — prism language key (python, jsx, json, bash, …)
 *   title    {string}  — optional label shown above the block
 */
export default function CodeBlock({ code, language = 'python', title }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="code-block">
      {title && (
        <div className="code-block-header">
          <span className="code-block-title">{title}</span>
          <span className="code-block-lang">{language}</span>
          <button className="code-copy-btn" onClick={copy}>
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
      )}
      {!title && (
        <button className="code-copy-btn code-copy-btn--floating" onClick={copy}>
          {copied ? '✓' : 'copy'}
        </button>
      )}
      <Highlight theme={themes.oneDark} code={code.trim()} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`code-pre ${className}`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="code-line-no">{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
