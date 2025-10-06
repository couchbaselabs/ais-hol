# Workshop Solutions: OpenAI Completion & System Prompt

## Backend (`backend/services/openaiService.js`)
Replace the placeholder in `generateResponse` with:

```js
// Use provided system prompt or default
const defaultSystemPrompt = "You are a helpful AI assistant. Please respond to the user's message in a friendly and helpful manner. Keep your responses concise but informative."
const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

// Generate content using OpenAI
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: finalSystemPrompt
    },
    {
      role: "user",
      content: userMessage
    }
  ],
  max_tokens: 1000,
  temperature: 0.7,
});

const response = completion.choices[0]?.message?.content;

if (!response) {
  throw new Error('No response generated from OpenAI');
}

return response.trim();
```

---

## Frontend (`frontend/src/App.jsx`)
Replace the placeholder in `sendMessage` with:

```js
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    message: messageText,
    systemPrompt: systemPrompt 
  }),
});

if (!response.ok) {
  throw new Error('Failed to send message');
}

const data = await response.json();

const botMessage = {
  id: Date.now() + 1,
  text: data.response,
  sender: 'bot',
  timestamp: new Date()
};

setMessages(prev => [...prev, botMessage]);
```

---

Attendees should implement these sections themselves during the workshop, then refer to this file for the full solution.
