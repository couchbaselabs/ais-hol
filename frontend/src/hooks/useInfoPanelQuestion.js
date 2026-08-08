import { useEffect } from 'react'

/**
 * Listens for the 'infopanel:question' CustomEvent dispatched when a user
 * clicks a "Try these" question in the InfoPanel, and calls the provided
 * setter with the question text.
 *
 * Usage:
 *   const [prompt, setPrompt] = useState('')
 *   useInfoPanelQuestion(setPrompt)
 */
export function useInfoPanelQuestion(setter) {
  useEffect(() => {
    const handler = (e) => setter(e.detail)
    window.addEventListener('infopanel:question', handler)
    return () => window.removeEventListener('infopanel:question', handler)
  }, [setter])
}
