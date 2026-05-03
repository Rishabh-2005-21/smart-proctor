import { useEffect, useMemo, useRef, useState } from "react";
import { api, getErrorMessage } from "../../services/api";
import { apiUrl } from "../../config/api";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" }
];

function buildSystemMessage(languageCode) {
  const languageLabel =
    LANGUAGES.find((l) => l.code === languageCode)?.label || "English";
  return `You are SmartProctor Help Assistant. Reply in ${languageLabel}. Be concise, step-by-step, and practical. If the user reports an error, ask for the exact message and which page they are on.`;
}

export default function HelpChatbot({ isOpen, onClose, user, activePageLabel }) {
  const scrollRef = useRef(null);
  const [language, setLanguage] = useState("en");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content:
        "Hi! I’m your SmartProctor help assistant. Tell me what you’re stuck on, and I’ll guide you."
    }
  ]);

  const userLabel = useMemo(() => user?.name || user?.email || "Student", [user]);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 30);
  }, [isOpen, messages.length]);

  const send = async () => {
    const text = String(input || "").trim();
    if (!text || sending) return;

    setError("");
    setSending(true);
    setInput("");

    const nextMessages = [
      ...messages,
      { role: "user", content: text }
    ];
    setMessages(nextMessages);

    try {
      const payload = {
        messages: [
          { role: "system", content: buildSystemMessage(language) },
          ...nextMessages
        ],
        context: {
          language,
          user: userLabel,
          page: activePageLabel || ""
        }
      };

      const res = await api.post(apiUrl("/ai/chat"), payload);
      const reply = res.data?.response || "Sorry, I couldn’t generate a reply.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(getErrorMessage(e, "Chatbot is unavailable right now."));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I can’t reach the AI right now. Try again in a minute. Meanwhile, tell me: which page are you on and what exact error/message you see?"
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="help-chatbot-overlay" role="dialog" aria-modal="true">
      <div className="help-chatbot">
        <div className="help-chatbot__header">
          <div>
            <div className="help-chatbot__eyebrow">Help Chatbot</div>
            <div className="help-chatbot__title">SmartProctor Assistant</div>
          </div>

          <div className="help-chatbot__header-right">
            <select
              className="help-chatbot__select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Chatbot language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button type="button" className="help-chatbot__close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="help-chatbot__meta">
          <div className="help-chatbot__pill">Page: {activePageLabel || "Dashboard"}</div>
          <div className="help-chatbot__pill">User: {userLabel}</div>
        </div>

        <div className="help-chatbot__body" ref={scrollRef}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`help-chatbot__msg ${
                m.role === "user" ? "help-chatbot__msg--user" : "help-chatbot__msg--assistant"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="help-chatbot__composer">
          {error && <div className="help-chatbot__error">{error}</div>}
          <div className="help-chatbot__row">
            <input
              className="help-chatbot__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your issue (e.g., ‘Quiz submit failed’)."
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button
              type="button"
              className="help-chatbot__send"
              onClick={send}
              disabled={sending || !String(input || "").trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

