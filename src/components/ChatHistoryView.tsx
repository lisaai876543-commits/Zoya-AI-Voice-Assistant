import { useState, useRef, useEffect } from 'react';
import { Trash2, MessageSquare, Bot, User, Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppConfig, AppState } from '../types';

export interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
  time?: string;
}

interface ChatHistoryViewProps {
  messages: ChatMessage[];
  config: AppConfig;
  appState: AppState;
  isSessionActive: boolean;
  onSendMessage: (text: string) => void;
  onClearMemory: () => void;
}

export default function ChatHistoryView({
  messages,
  config,
  appState,
  isSessionActive,
  onSendMessage,
  onClearMemory,
}: ChatHistoryViewProps) {
  const [inputText, setInputText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, appState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden bg-[#0A0C10] relative">
      {/* Top Header */}
      <div className="shrink-0 px-4 py-3 sm:px-6 border-b border-white/10 bg-[#141620] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
              Conversation Memory
            </h2>
            <p className="text-[11px] text-white/50">
              {messages.length} message{messages.length === 1 ? '' : 's'} recorded
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-red-400 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          title="Clear all conversation memory"
        >
          <Trash2 size={14} />
          <span className="hidden xs:inline">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {(!Array.isArray(messages) || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-white/40 text-xs">
            <MessageSquare size={24} className="mb-2 text-white/20" />
            <p>No messages recorded yet</p>
          </div>
        )}
        {(Array.isArray(messages) ? messages : []).map((msg) => {
          const isZoya = msg?.sender === "zoya";

          return (
            <motion.div
              key={msg?.id || `msg-${Math.random()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 max-w-[88%] sm:max-w-[80%] ${
                isZoya ? "self-start mr-auto" : "self-end ml-auto flex-row-reverse"
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                isZoya
                  ? "bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-pink-500/20"
                  : "bg-gradient-to-tr from-violet-600 to-cyan-500 text-white shadow-cyan-500/20"
              }`}>
                {isZoya ? <Bot size={15} /> : <User size={15} />}
              </div>

              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                isZoya
                  ? "bg-[#161824] border border-white/10 text-white/90 rounded-tl-sm"
                  : "bg-gradient-to-r from-violet-600/90 to-pink-600/90 text-white rounded-tr-sm"
              }`}>
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-white/50">
                  <span className={`font-medium ${isZoya ? "text-pink-300" : "text-cyan-200"}`}>
                    {isZoya ? config.assistantName : config.userName || "Usman"}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            </motion.div>
          );
        })}

        {/* Live typing / replying indicator */}
        {appState === "processing" && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-2 rounded-2xl w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{config.assistantName} is thinking...</span>
          </div>
        )}

        {appState === "speaking" && isSessionActive && (
          <div className="flex items-center gap-2 text-xs text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3.5 py-2 rounded-2xl w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
            <span>{config.assistantName} is speaking...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Message input bar */}
      <div className="shrink-0 p-3 sm:p-4 bg-[#141620] border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${config.assistantName}...`}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/70 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-40 disabled:hover:scale-100 text-white transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-pink-500/20"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-[#181A24] border border-white/10 p-6 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Clear Conversation Memory?</h3>
                <p className="text-xs text-white/60 mt-1">
                  This will erase stored conversation history. {config.assistantName} will reset to her initial warm greeting.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(false);
                    onClearMemory();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-lg shadow-red-500/25"
                >
                  Yes, Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
