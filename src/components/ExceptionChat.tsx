'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, MessageSquare, Paperclip, X, FileText, Play } from 'lucide-react';

interface Attachment {
  name: string;
  type: 'image' | 'video' | 'pdf';
  base64: string;
  size: number;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'client' | 'admin';
  timestamp: string;
  attachments?: Attachment[];
}

interface ExceptionChatProps {
  orderId: string;
  isAdmin: boolean;
}

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function AttachmentBubble({
  attachments,
  isOwn,
  isAdmin,
  onImageClick,
}: {
  attachments: Attachment[];
  isOwn: boolean;
  isAdmin: boolean;
  onImageClick: (src: string) => void;
}) {
  return (
    <div className="mt-1.5 space-y-1">
      {attachments.length > 2 && (
        <p className={`text-[10px] font-600 mb-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
          📎 {attachments.length} attachments
        </p>
      )}
      {attachments.map((a, i) => (
        <div key={i}>
          {a.type === 'image' && (
            <button onClick={() => onImageClick(a.base64)} className="block">
              <img
                src={a.base64}
                alt={a.name}
                className="max-w-[160px] max-h-[100px] rounded-lg object-cover border border-white/20 hover:opacity-90 cursor-zoom-in"
              />
            </button>
          )}
          {a.type === 'video' && (
            <video
              src={a.base64}
              controls
              className="max-w-[200px] rounded-lg"
              style={{ maxHeight: 120 }}
            />
          )}
          {a.type === 'pdf' && (
            <div className={`flex items-center gap-1.5 text-[10px] ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}>
              <FileText className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
              <span className="truncate max-w-[140px]">{a.name}</span>
              {isAdmin && (
                <a href={a.base64} download={a.name} className="underline hover:no-underline ml-1 text-[#7a9e9f]">
                  Download
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ExceptionChat({ orderId, isAdmin }: ExceptionChatProps) {
  const storageKey = `exception-chat-${orderId}`;
  const resolvedKey = `exception-chat-resolved-${orderId}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [resolved, setResolved] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setMessages(JSON.parse(stored));
    setResolved(localStorage.getItem(resolvedKey) === 'true');
  }, [storageKey, resolvedKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (pending.length + picked.length > 3) {
      alert('Max 3 attachments per message.');
      e.target.value = '';
      return;
    }
    const results: Attachment[] = [];
    for (const file of picked) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 5 MB limit and was skipped.`);
        continue;
      }
      const base64 = await toBase64(file);
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setPending(prev => [...prev, ...results].slice(0, 3));
    e.target.value = '';
  }

  function removeAttachment(i: number) {
    setPending(prev => prev.filter((_, j) => j !== i));
  }

  function sendMessage() {
    if ((!input.trim() && pending.length === 0) || resolved) return;
    const msgId = `msg-${Date.now()}`;
    const msg: ChatMessage = {
      id: msgId,
      text: input.trim(),
      sender: isAdmin ? 'admin' : 'client',
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      attachments: pending.length > 0 ? [...pending] : undefined,
    };
    if (pending.length > 0) {
      localStorage.setItem(`support-attachments-${orderId}-${msgId}`, JSON.stringify(pending));
    }
    const updated = [...messages, msg];
    setMessages(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setInput('');
    setPending([]);
  }

  function markResolved() {
    setResolved(true);
    localStorage.setItem(resolvedKey, 'true');
  }

  const unreadCount = messages.filter(m => m.sender !== (isAdmin ? 'admin' : 'client')).length;
  const hasProof = messages.some(m => m.sender === 'client' && m.attachments && m.attachments.length > 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <h3 className="font-700 text-sm">Exception Chat</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-700 bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
          {resolved && (
            <span className="px-2 py-0.5 text-[10px] font-600 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </span>
          )}
          {isAdmin && hasProof && (
            <span className="px-2 py-0.5 text-[10px] font-600 bg-[#e4eeee] text-[#6b8f90] rounded-full">
              📎 Proof Submitted
            </span>
          )}
        </div>
        {isAdmin && !resolved && (
          <button
            onClick={markResolved}
            className="text-xs font-600 text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto mb-3 p-2 bg-muted/20 rounded-lg">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No messages yet.{' '}
            {isAdmin ? 'Send the first message to the client.' : 'Ask admin about this exception.'}
          </p>
        ) : (
          messages.map(msg => {
            const isOwn =
              (isAdmin && msg.sender === 'admin') || (!isAdmin && msg.sender === 'client');
            const label = isOwn ? 'You' : isAdmin ? 'Client' : 'Admin';
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                    isOwn ? 'bg-[#4A3B52] text-white' : 'bg-white border border-border text-foreground'
                  }`}
                >
                  <p
                    className={`text-[10px] font-600 mb-0.5 ${
                      isOwn ? 'text-white/80' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </p>
                  {msg.text && <p>{msg.text}</p>}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <AttachmentBubble
                      attachments={msg.attachments}
                      isOwn={isOwn}
                      isAdmin={isAdmin}
                      onImageClick={setLightbox}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pending.map((a, i) => (
            <div
              key={i}
              className="relative flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border"
            >
              {a.type === 'image' ? (
                <img src={a.base64} alt={a.name} className="w-8 h-8 object-cover rounded" />
              ) : a.type === 'video' ? (
                <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-slate-600" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-red-500" />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">
                {a.name}
              </span>
              <button
                onClick={() => removeAttachment(i)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!resolved && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept="image/*,video/*,.pdf"
            multiple
            onChange={handleFiles}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={pending.length >= 3}
            title="Attach files (max 3, up to 5 MB each)"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 disabled:opacity-40 shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={
              isAdmin ? 'Reply to client...' : 'Message admin about this exception...'
            }
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() && pending.length === 0}
            className="btn-primary px-3 py-2 text-xs inline-flex items-center gap-1 disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="attachment"
            className="max-w-full max-h-[90vh] rounded-xl shadow-xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
