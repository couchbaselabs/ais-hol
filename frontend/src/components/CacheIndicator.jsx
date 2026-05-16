import React from 'react'
import './CacheIndicator.css'

/**
 * Small badge shown on bot messages to indicate whether the response
 * came from the semantic cache or was freshly generated.
 */
export default function CacheIndicator({ hit }) {
  if (hit === null || hit === undefined) return null
  return (
    <span className={`cache-indicator ${hit ? 'cache-indicator--hit' : 'cache-indicator--miss'}`}>
      {hit ? '⚡ cache hit' : '🔄 generated'}
    </span>
  )
}
