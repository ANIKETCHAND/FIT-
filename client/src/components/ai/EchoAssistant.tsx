/* FitTrack: Rexi AI Conversational Assistant (Powered by Live Context Engine + Voice Commands) */
import { useState, useRef, useEffect } from "react";
import { Send, X, Minus, Trash2, Copy, Check, Zap, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useSidebar } from "@/lib/sidebar-store";
import { getLiveRexiContext, generateRexiChatResponse } from "@/lib/rexi-ai-engine";
import { toast } from "sonner";
import "./EchoAssistant.css";

// Vector Mascot SVG matching Rexi's look
export function RexiMascotIcon({ size = 32, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <circle cx="50" cy="52" r="38" fill="url(#rexiGlow)" opacity="0.45" />
      <path
        d="M 50 14 
           C 68 14, 82 28, 82 48 
           C 82 66, 80 82, 70 82 
           C 64 82, 60 74, 50 74 
           C 40 74, 36 82, 30 82 
           C 20 82, 18 66, 18 48 
           C 18 30, 32 14, 50 14 Z"
        fill="url(#rexiBodyGrad)"
        stroke="#baff57"
        strokeWidth="3.5"
      />
      <path
        d="M 50 14 C 42 10, 36 2, 28 6 C 22 10, 26 18, 38 18"
        fill="#baff57"
        stroke="#84cc16"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="36" cy="46" rx="5.5" ry="9" fill="#ece1cc" />
      <ellipse cx="38" cy="43" rx="2" ry="3.5" fill="#ffffff" />
      <ellipse cx="64" cy="46" rx="5.5" ry="9" fill="#ece1cc" />
      <ellipse cx="66" cy="43" rx="2" ry="3.5" fill="#ffffff" />
      <ellipse cx="28" cy="56" rx="4.5" ry="2.5" fill="#84cc16" opacity="0.6" />
      <ellipse cx="72" cy="56" rx="4.5" ry="2.5" fill="#84cc16" opacity="0.6" />
      <defs>
        <radialGradient id="rexiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#baff57" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rexiBodyGrad" x1="50" y1="10" x2="50" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9f99d" />
          <stop offset="0.45" stopColor="#a3e635" />
          <stop offset="1" stopColor="#4d7c0f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const EchoMascotIcon = RexiMascotIcon;

type ChatMessage = {
  id: string;
  sender: "rexi" | "user";
  text: string;
  chips?: string[];
  timestamp: string;
};

export function RexiAssistant() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { open: isSidebarOpen } = useSidebar();

  const liveContext = getLiveRexiContext(location);
  const firstName = liveContext.athleteName.split(" ")[0] || "Athlete";

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "intro-1",
          sender: "rexi",
          text: `Hello **${firstName}**! 👋 I'm **Rexi**, your personal AI fitness coach powered by real-time telemetry and voice intelligence.

Ask me **anything** using text or the 🎙️ **Voice Command** button!`,
          chips: [
            "What should I eat for dinner?",
            "What is today's date?",
            "Explain Creatine dosage",
            "Give me a 3-exercise chest workout",
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [firstName]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Initialize Speech Recognition with explicit permission handling
  const toggleVoiceRecognition = async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    // Explicitly prompt for microphone permission if needed
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release audio stream immediately so SpeechRecognition can use it
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        toast.error("Microphone access was blocked. Please click the 🔒 lock icon in your browser URL bar to allow Microphone permission.", {
          duration: 5000,
        });
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("🎙️ Listening... Speak your question now!");
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");

        setInputMessage(transcript);

        // If recognition is final, auto-send prompt
        if (event.results[0] && event.results[0].isFinal) {
          setIsListening(false);
          if (transcript.trim()) {
            handleSend(transcript.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          toast.error("Microphone access blocked. Click the 🔒 lock icon in your browser URL bar and allow Microphone.", {
            duration: 5000,
          });
        } else if (event.error === "no-speech") {
          toast.info("No speech detected. Tap the mic again when ready.");
        } else if (event.error !== "aborted") {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      toast.error("Click the 🔒 lock icon next to the URL to enable microphone access.");
    }
  };

  // Text-to-Speech Read Aloud
  const handleSpeak = (text: string, id: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech audio is not supported in this browser.");
      return;
    }

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown formatting for clean natural voice reading
    const cleanText = text
      .replace(/[*#_`]/g, "")
      .replace(/•\s+/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")) && v.lang.startsWith("en")
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || inputMessage).trim();
    if (!textToSend || isTyping) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsTyping(true);

    try {
      const historyForContext = messages.map((m) => ({ sender: m.sender, text: m.text }));
      const response = await generateRexiChatResponse(textToSend, liveContext, historyForContext);

      const rexiMsgId = `rexi-${Date.now()}`;
      const fullText = response.text;
      const chips = response.chips;

      // Stream text onto UI smoothly
      let currentText = "";
      const streamChunkSize = Math.max(4, Math.floor(fullText.length / 25));

      setMessages((prev) => [
        ...prev,
        {
          id: rexiMsgId,
          sender: "rexi",
          text: "",
          chips,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      let idx = 0;
      const interval = setInterval(() => {
        if (idx < fullText.length) {
          idx += streamChunkSize;
          currentText = fullText.slice(0, idx);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === rexiMsgId ? { ...msg, text: currentText } : msg))
          );
        } else {
          clearInterval(interval);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === rexiMsgId ? { ...msg, text: fullText } : msg))
          );
          setIsTyping(false);
        }
      }, 15);
    } catch (err) {
      setIsTyping(false);
      toast.error("Rexi encountered an error. Please try again.");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied answer to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
    setMessages([
      {
        id: `intro-${Date.now()}`,
        sender: "rexi",
        text: `Chat cleared! Ready for your next question or voice command, **${firstName}**! 🚀`,
        chips: [
          "What should I eat today?",
          "Explain Creatine dosage",
          "Give me a 3-exercise chest workout",
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.info("Chat history cleared.");
  };

  if (location === "/" || location === "/landing") {
    return null;
  }

  return (
    <div className={`echo-assistant-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {/* Floating Animated Mascot Button */}
      <button
        className="echo-mascot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ask Rexi AI Assistant"
        title="Ask Rexi AI (Voice & Text Assistant)"
      >
        <div className="echo-mascot-pulse" />
        <div className="echo-mascot-svg-wrap">
          <RexiMascotIcon size={44} animated />
        </div>
        <span className="echo-mascot-tooltip">Ask Rexi AI (Voice & Chat)</span>
      </button>

      {/* ChatGPT / Gemini Style AI Assistant Chat Dialog */}
      {isOpen && (
        <aside className="echo-chat-dialog" aria-label="Rexi AI Chat Assistant">
          {/* Header */}
          <div className="echo-header">
            <div className="echo-header-left">
              <div className="echo-header-icon">
                <RexiMascotIcon size={28} />
              </div>
              <div className="echo-title-group">
                <div className="echo-title-row">
                  <span className="echo-title">Rexi AI</span>
                  <span className="echo-beta-badge flex items-center gap-1">
                    <Zap size={10} />
                    <span>Gemini Live</span>
                  </span>
                </div>
                <span className="echo-subtitle">
                  {firstName} ({liveContext.massKg}kg • {liveContext.remainingProtein}g P Left)
                </span>
              </div>
            </div>
            <div className="echo-header-actions">
              <button
                className="echo-header-btn"
                onClick={handleClearChat}
                aria-label="Clear chat"
                title="Clear Chat"
              >
                <Trash2 size={15} />
              </button>
              <button
                className="echo-header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize Chat"
                title="Minimize"
              >
                <Minus size={16} />
              </button>
              <button
                className="echo-header-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Voice Listening Banner */}
          {isListening && (
            <div className="echo-listening-banner">
              <div className="echo-listening-waves">
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
              </div>
              <span className="echo-listening-text">Listening... Speak now to Rexi</span>
              <button
                className="echo-listening-cancel"
                onClick={toggleVoiceRecognition}
                title="Cancel voice input"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="echo-messages-container" ref={scrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`echo-msg echo-msg-${msg.sender === "rexi" ? "assistant" : "user"}`}>
                {msg.sender === "rexi" && (
                  <div className="echo-msg-sender-row">
                    <div className="flex items-center gap-1.5">
                      <RexiMascotIcon size={16} />
                      <span className="font-bold text-white text-xs">Rexi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#5a6b58]">{msg.timestamp}</span>
                      <button
                        onClick={() => handleSpeak(msg.text, msg.id)}
                        className={`text-[#8b9c8a] hover:text-white transition-colors ${speakingMsgId === msg.id ? "text-[#baff57] animate-pulse" : ""}`}
                        title={speakingMsgId === msg.id ? "Stop voice reading" : "Read answer aloud"}
                      >
                        {speakingMsgId === msg.id ? <VolumeX size={13} className="text-[#baff57]" /> : <Volume2 size={13} />}
                      </button>
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="text-[#8b9c8a] hover:text-white transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-[#c9ad7e]" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="echo-msg-bubble">
                  {formatMarkdown(msg.text)}
                </div>

                {/* Prompt Suggestion Chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="echo-chips-row">
                    {msg.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        className="echo-chip-btn"
                        onClick={() => handleSend(chip)}
                        disabled={isTyping}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="echo-msg echo-msg-assistant">
                <div className="echo-msg-sender-row">
                  <RexiMascotIcon size={16} />
                  <span>Rexi is analyzing...</span>
                </div>
                <div className="echo-typing-indicator">
                  <span className="echo-typing-dot" />
                  <span className="echo-typing-dot" />
                  <span className="echo-typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Message Input with Voice Command Button */}
          <form
            className="echo-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`echo-mic-btn ${isListening ? "is-listening" : ""}`}
              title={isListening ? "Stop listening" : "Voice search / Command"}
              aria-label={isListening ? "Stop listening" : "Voice command"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(100, e.target.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening... Speak now..." : "Ask or speak to Rexi..."}
              className="echo-input-field"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="echo-send-btn"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}

export const EchoAssistant = RexiAssistant;

// Enhanced Markdown Formatter
function formatMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} style={{ height: 6 }} />;

    // Headings (### or ##)
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} style={{ margin: "10px 0 4px 0", color: "#baff57", fontSize: "0.88rem", fontWeight: 700 }}>
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={idx} style={{ margin: "12px 0 4px 0", color: "#baff57", fontSize: "0.94rem", fontWeight: 800 }}>
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    }

    // Bullet points (• , - , * )
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[\*\-\•]\s+/, "");
      return (
        <li key={idx} style={{ marginLeft: 16, marginBottom: 4, listStyleType: "disc" }}>
          {parseInline(content)}
        </li>
      );
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      return (
        <li key={idx} style={{ marginLeft: 16, marginBottom: 4, listStyleType: "decimal" }}>
          <strong>{numberedMatch[1]}.</strong> {parseInline(numberedMatch[2])}
        </li>
      );
    }

    return (
      <p key={idx} style={{ margin: "0 0 6px 0" }}>
        {parseInline(line)}
      </p>
    );
  });
}

function parseInline(text: string) {
  const parts = text.split(/(\*{2}.*?\*{2}|\*[^*]+?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index} style={{ color: "#baff57", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
