'use client';

import { useState, useRef } from 'react';

type Message = { id: string; role: 'user' | 'ai'; text: string };

export default function Chat() {
  const pdfContextRef = useRef('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { setUploadStatus(`❌ Error: ${await res.text()}`); return; }
      const data = await res.json();
      pdfContextRef.current = data.text;
      setUploadStatus(`✅ PDF loaded — ${data.chunks} chunks indexed`);
    } catch (err) {
      setUploadStatus(`❌ Failed: ${err}`);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!input.trim() || isLoading) return;
    const question = input;
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: question }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, documentText: pdfContextRef.current }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'ai', text: data.answer ?? data.error ?? 'No response' }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'ai', text: `❌ ${err}` }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full max-w-2xl py-12 mx-auto">
      <h1 className="text-2xl font-bold mb-2">RAG Chatbot + Agenta Tracing</h1>
      <p className="text-gray-500 text-sm mb-6">Upload a PDF under 4MB, then ask questions about it.</p>

      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-lg">
        <label className="block text-sm font-medium mb-2">Upload PDF</label>
        <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="text-sm" />
        {uploadStatus && <p className="mt-2 text-sm text-green-600">{uploadStatus}</p>}
      </div>

      <div className="flex flex-col gap-3 mb-32">
        {messages.map(message => (
          <div key={message.id} className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
            <span className="text-xs font-semibold text-gray-400 uppercase">{message.role === 'user' ? 'You' : 'AI'}</span>
            <p className="mt-1 text-sm text-gray-900">{message.text}</p>
          </div>
        ))}
        {isLoading && <p className="text-xs text-gray-400 ml-2">Thinking...</p>}
      </div>

      <div className="fixed bottom-0 w-full max-w-2xl mb-8 flex gap-2">
        <input
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow bg-white text-black text-sm"
          value={input}
          placeholder="Ask something about your PDF..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); }}}
        />
        <button onClick={send} className="px-4 py-3 bg-black text-white rounded-lg text-sm font-medium">
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
