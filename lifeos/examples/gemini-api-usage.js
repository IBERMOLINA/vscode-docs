/**
 * Example usage of Gemini API endpoints
 * 
 * This file demonstrates how to interact with the Gemini API
 * endpoints in your lifeos application.
 */

// Example 1: Simple text generation
async function generateText(prompt) {
  try {
    const response = await fetch('http://localhost:3001/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: 'gemini-pro', // You can also use 'gemini-pro-vision' for image inputs
        maxTokens: 1000
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Generated text:', data.response);
      return data.response;
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example 2: Chat conversation
async function chatWithGemini(messages) {
  try {
    const response = await fetch('http://localhost:3001/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages,
        model: 'gemini-pro'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Chat response:', data.response);
      return data.response;
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example usage:

// 1. Simple text generation
generateText('Write a short poem about coding');

// 2. Chat conversation
const conversation = [
  { role: 'user', content: 'Hello! Can you help me understand React hooks?' },
  { role: 'assistant', content: 'Of course! React hooks are functions that let you use state and other React features in functional components.' },
  { role: 'user', content: 'Can you give me an example of useState?' }
];

chatWithGemini(conversation);

// 3. React component example
const GeminiChatComponent = () => {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="loading">Thinking...</div>}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
};

module.exports = {
  generateText,
  chatWithGemini,
  GeminiChatComponent
};