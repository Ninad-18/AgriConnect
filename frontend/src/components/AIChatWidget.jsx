import React, { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../context/I18nContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function AIChatWidget() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "bot", text: lang === "hi" ? "नमस्ते! मैं एग्रीबिड सहायक हूँ। कैसे मदद करूँ?" : "Hi! I'm the AgriBid Assistant. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", { message: text, language: lang });
      setMsgs((m) => [...m, { role: "bot", text: res.data.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Sorry, I'm unavailable right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} data-testid="chat-open"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-terracotta text-white shadow-xl flex items-center justify-center lift-hover">
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[520px] bg-white rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden" data-testid="chat-panel">
          <div className="bg-forest text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-head font-bold"><Sparkles className="w-4 h-4 text-ochre" /> AgriBid Assistant</div>
            <button onClick={() => setOpen(false)} data-testid="chat-close"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-sand/40">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-forest text-white rounded-br-sm" : "bg-white border border-border text-gray-800 rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-muted-foreground px-1">typing…</div>}
          </div>
          <div className="p-3 border-t border-border flex gap-2 bg-white">
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask anything…" data-testid="chat-input" />
            <Button onClick={send} className="bg-terracotta hover:bg-terracotta/90" data-testid="chat-send"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
}
