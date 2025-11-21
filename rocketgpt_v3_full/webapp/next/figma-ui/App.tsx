import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Rocket,
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  X,
  Menu,
  Sun,
  Moon,
  Settings,
  User,
  ChevronDown,
  Send,
  Code,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Sparkles,
  Zap,
  FileText,
  BookOpen,
  Terminal,
  Search,
  Clock,
  Bot,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Square,
} from "lucide-react";

// Theme Context
type Theme = "light" | "dark";
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(
      "rocketgpt-theme",
    ) as Theme;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("rocketgpt-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error(
      "useTheme must be used within ThemeProvider",
    );
  return context;
}

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
}

// UI Components
function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: any) {
  const { theme } = useTheme();

  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3",
  };
  const variantStyles = {
    primary:
      theme === "dark"
        ? "bg-[#10A37F] hover:bg-[#0E8C6F] text-white"
        : "bg-[#10A37F] hover:bg-[#0E8C6F] text-white",
    secondary:
      theme === "dark"
        ? "bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#ECECEC] border border-[#4D4D4D]"
        : "bg-white hover:bg-[#F7F7F8] text-[#0D0D0D] border border-[#C4C4C4]",
    ghost:
      theme === "dark"
        ? "hover:bg-[#2D2D2D] text-[#ECECEC]"
        : "hover:bg-[#F7F7F8] text-[#0D0D0D]",
    danger: "bg-[#EF4444] hover:bg-[#DC2626] text-white",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  className = "",
  ...props
}: any) {
  const { theme } = useTheme();
  return (
    <button
      className={`p-2 rounded-lg transition-all ${
        theme === "dark"
          ? "hover:bg-[#2D2D2D] text-[#ECECEC]"
          : "hover:bg-[#F7F7F8] text-[#0D0D0D]"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Sidebar Component
function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose,
}: any) {
  const { theme, toggleTheme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");

  const bgPrimary =
    theme === "dark" ? "bg-[#171717]" : "bg-[#F7F7F8]";
  const bgSecondary =
    theme === "dark" ? "bg-[#212121]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#2D2D2D]" : "border-[#E5E5E5]";
  const textPrimary =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const textSecondary =
    theme === "dark" ? "text-[#8E8E8E]" : "text-[#6E6E6E]";

  const handleStartEdit = (chat: Chat) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = (chatId: string) => {
    // In a real app, save the title
    setEditingId(null);
  };

  const groupedChats = {
    today: chats.filter((c: Chat) => isToday(c.updatedAt)),
    yesterday: chats.filter((c: Chat) =>
      isYesterday(c.updatedAt),
    ),
    previous7Days: chats.filter((c: Chat) =>
      isPrevious7Days(c.updatedAt),
    ),
    older: chats.filter(
      (c: Chat) =>
        !isToday(c.updatedAt) &&
        !isYesterday(c.updatedAt) &&
        !isPrevious7Days(c.updatedAt),
    ),
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[260px] ${bgPrimary} border-r ${borderColor}
        flex flex-col
        transform transition-transform duration-200
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Header */}
        <div className="p-3 border-b border-inherit">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={onNewChat}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2">
          {groupedChats.today.length > 0 && (
            <div className="mb-4">
              <div
                className={`px-3 py-2 text-xs ${textSecondary}`}
              >
                Today
              </div>
              {groupedChats.today.map((chat: Chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editTitle={editTitle}
                  onSelect={() => onSelectChat(chat.id)}
                  onEdit={() => handleStartEdit(chat)}
                  onSaveEdit={() => handleSaveEdit(chat.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => onDeleteChat(chat.id)}
                  setEditTitle={setEditTitle}
                />
              ))}
            </div>
          )}

          {groupedChats.yesterday.length > 0 && (
            <div className="mb-4">
              <div
                className={`px-3 py-2 text-xs ${textSecondary}`}
              >
                Yesterday
              </div>
              {groupedChats.yesterday.map((chat: Chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editTitle={editTitle}
                  onSelect={() => onSelectChat(chat.id)}
                  onEdit={() => handleStartEdit(chat)}
                  onSaveEdit={() => handleSaveEdit(chat.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => onDeleteChat(chat.id)}
                  setEditTitle={setEditTitle}
                />
              ))}
            </div>
          )}

          {groupedChats.previous7Days.length > 0 && (
            <div className="mb-4">
              <div
                className={`px-3 py-2 text-xs ${textSecondary}`}
              >
                Previous 7 Days
              </div>
              {groupedChats.previous7Days.map((chat: Chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editTitle={editTitle}
                  onSelect={() => onSelectChat(chat.id)}
                  onEdit={() => handleStartEdit(chat)}
                  onSaveEdit={() => handleSaveEdit(chat.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => onDeleteChat(chat.id)}
                  setEditTitle={setEditTitle}
                />
              ))}
            </div>
          )}

          {groupedChats.older.length > 0 && (
            <div className="mb-4">
              <div
                className={`px-3 py-2 text-xs ${textSecondary}`}
              >
                Older
              </div>
              {groupedChats.older.map((chat: Chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  isEditing={editingId === chat.id}
                  editTitle={editTitle}
                  onSelect={() => onSelectChat(chat.id)}
                  onEdit={() => handleStartEdit(chat)}
                  onSaveEdit={() => handleSaveEdit(chat.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => onDeleteChat(chat.id)}
                  setEditTitle={setEditTitle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#10A37F]" : "bg-[#10A37F]"}`}
              >
                <User className="w-4 h-4 text-white" />
              </div>
              <span className={`text-sm ${textPrimary}`}>
                User
              </span>
            </div>
            <div className="flex gap-1">
              <IconButton onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </IconButton>
              <IconButton>
                <Settings className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChatItem({
  chat,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  setEditTitle,
}: any) {
  const { theme } = useTheme();
  const [showActions, setShowActions] = useState(false);

  const activeColor =
    theme === "dark" ? "bg-[#2D2D2D]" : "bg-[#E5E5E5]";
  const hoverColor =
    theme === "dark"
      ? "hover:bg-[#2D2D2D]"
      : "hover:bg-[#E5E5E5]";
  const textPrimary =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const textSecondary =
    theme === "dark" ? "text-[#8E8E8E]" : "text-[#6E6E6E]";

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1
        ${isActive ? activeColor : hoverColor}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={!isEditing ? onSelect : undefined}
    >
      <MessageSquare
        className={`w-4 h-4 flex-shrink-0 ${textSecondary}`}
      />

      {isEditing ? (
        <div
          className="flex-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`flex-1 px-2 py-1 rounded text-sm ${
              theme === "dark"
                ? "bg-[#171717] text-[#ECECEC]"
                : "bg-white text-[#0D0D0D]"
            } border border-[#10A37F] focus:outline-none`}
            autoFocus
          />
          <IconButton onClick={onSaveEdit}>
            <Check className="w-3 h-3 text-[#10A37F]" />
          </IconButton>
          <IconButton onClick={onCancelEdit}>
            <X className="w-3 h-3" />
          </IconButton>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 text-sm truncate ${textPrimary}`}
          >
            {chat.title}
          </span>
          {showActions && (
            <div
              className="flex gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton onClick={onEdit}>
                <Edit3 className="w-3 h-3" />
              </IconButton>
              <IconButton onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Message Component
function MessageBubble({ message, onCopy, onRegenerate }: any) {
  const { theme } = useTheme();
  const isUser = message.role === "user";

  const bgColor =
    theme === "dark"
      ? isUser
        ? "bg-transparent"
        : "bg-[#212121]"
      : isUser
        ? "bg-transparent"
        : "bg-[#F7F7F8]";
  const textColor =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const iconBg =
    theme === "dark" ? "bg-[#10A37F]" : "bg-[#10A37F]";
  const userIconBg =
    theme === "dark" ? "bg-[#5436DA]" : "bg-[#5436DA]";

  return (
    <div className={`group ${bgColor} py-8`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-6">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${isUser ? userIconBg : iconBg}`}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Sparkles className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`${textColor} whitespace-pre-wrap break-words`}
          >
            {message.content}
          </div>

          {/* Actions */}
          {!isUser && (
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconButton
                onClick={() => onCopy(message.content)}
              >
                <Copy className="w-4 h-4" />
              </IconButton>
              <IconButton
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw className="w-4 h-4" />
              </IconButton>
              <IconButton>
                <ThumbsUp className="w-4 h-4" />
              </IconButton>
              <IconButton>
                <ThumbsDown className="w-4 h-4" />
              </IconButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Welcome Screen
function WelcomeScreen({ onQuickStart }: any) {
  const { theme } = useTheme();
  const textPrimary =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const textSecondary =
    theme === "dark" ? "text-[#8E8E8E]" : "text-[#6E6E6E]";
  const cardBg = theme === "dark" ? "bg-[#2D2D2D]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#3D3D3D]" : "border-[#E5E5E5]";

  const examples = [
    {
      icon: Code,
      title: "Review my code",
      desc: "Get instant code review and suggestions",
    },
    {
      icon: Terminal,
      title: "Debug an error",
      desc: "Analyze and fix bugs in your code",
    },
    {
      icon: FileText,
      title: "Write documentation",
      desc: "Generate clear technical docs",
    },
    {
      icon: Zap,
      title: "Optimize performance",
      desc: "Find bottlenecks and improvements",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${theme === "dark" ? "bg-gradient-to-br from-[#10A37F] to-[#5436DA]" : "bg-gradient-to-br from-[#10A37F] to-[#5436DA]"}`}
          >
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className={`text-4xl ${textPrimary}`}>
            RocketGPT
          </h1>
          <p className={`text-lg ${textSecondary}`}>
            Your AI-powered development companion
          </p>
        </div>

        {/* Quick Start Examples */}
        <div>
          <h2
            className={`text-sm ${textSecondary} mb-4 text-center`}
          >
            Quick start
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {examples.map((example, i) => {
              const Icon = example.icon;
              return (
                <button
                  key={i}
                  onClick={() => onQuickStart(example.title)}
                  className={`${cardBg} border ${borderColor} rounded-xl p-4 text-left transition-all hover:scale-105 hover:shadow-lg`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-[#10A37F]" : "bg-[#10A37F]"}`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={`${textPrimary} mb-1`}>
                        {example.title}
                      </h3>
                      <p className={`text-sm ${textSecondary}`}>
                        {example.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div
          className={`text-center text-sm ${textSecondary} space-y-2`}
        >
          <p>
            ✨ Advanced AI models • 💬 Context-aware
            conversations • 🚀 Developer-optimized
          </p>
        </div>
      </div>
    </div>
  );
}

// Chat Input
function ChatInput({ onSend, disabled }: any) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bgColor =
    theme === "dark" ? "bg-[#212121]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#3D3D3D]" : "border-[#C4C4C4]";
  const textColor =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const placeholderColor =
    theme === "dark"
      ? "placeholder-[#8E8E8E]"
      : "placeholder-[#6E6E6E]";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height =
      Math.min(e.target.scrollHeight, 200) + "px";
  };

  return (
    <div
      className={`border-t ${borderColor} ${theme === "dark" ? "bg-[#171717]" : "bg-[#F7F7F8]"}`}
    >
      <div className="max-w-3xl mx-auto p-4">
        <form onSubmit={handleSubmit}>
          <div
            className={`${bgColor} border ${borderColor} rounded-2xl shadow-lg flex items-end gap-2 p-3`}
          >
            {/* Attachment Button */}
            <IconButton type="button">
              <Paperclip className="w-5 h-5" />
            </IconButton>

            {/* Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message RocketGPT..."
              disabled={disabled}
              rows={1}
              className={`flex-1 resize-none ${textColor} ${placeholderColor} bg-transparent focus:outline-none max-h-[200px] py-2`}
            />

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!input.trim() || disabled}
              className="rounded-xl"
              size="sm"
            >
              {isGenerating ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Footer Text */}
        <p
          className={`text-xs text-center mt-3 ${theme === "dark" ? "text-[#8E8E8E]" : "text-[#6E6E6E]"}`}
        >
          RocketGPT can make mistakes. Consider checking
          important information.
        </p>
      </div>
    </div>
  );
}

// Model Selector
function ModelSelector({ currentModel, onSelectModel }: any) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const models = [
    { id: "gpt-4", name: "GPT-4", desc: "Most capable model" },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      desc: "Fast and efficient",
    },
    {
      id: "claude-3",
      name: "Claude 3 Opus",
      desc: "Advanced reasoning",
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      desc: "Google AI model",
    },
  ];

  const textColor =
    theme === "dark" ? "text-[#ECECEC]" : "text-[#0D0D0D]";
  const textSecondary =
    theme === "dark" ? "text-[#8E8E8E]" : "text-[#6E6E6E]";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          theme === "dark"
            ? "hover:bg-[#2D2D2D]"
            : "hover:bg-[#F7F7F8]"
        }`}
      >
        <Bot className="w-4 h-4" />
        <span className={`text-sm ${textColor}`}>
          {models.find((m) => m.id === currentModel)?.name ||
            "GPT-4"}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-2xl border ${
            theme === "dark"
              ? "bg-[#212121] border-[#3D3D3D]"
              : "bg-white border-[#E5E5E5]"
          } z-50`}
        >
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelectModel(model.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 first:rounded-t-xl last:rounded-b-xl ${
                theme === "dark"
                  ? "hover:bg-[#2D2D2D]"
                  : "hover:bg-[#F7F7F8]"
              } ${currentModel === model.id ? (theme === "dark" ? "bg-[#2D2D2D]" : "bg-[#F7F7F8]") : ""}`}
            >
              <div className={textColor}>{model.name}</div>
              <div className={`text-xs ${textSecondary}`}>
                {model.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Main App
function AppContent() {
  const { theme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "React Performance Optimization",
      messages: [
        {
          id: "1",
          role: "user",
          content:
            "How can I optimize my React app performance?",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Here are some key strategies for optimizing React app performance:\n\n1. Use React.memo() to prevent unnecessary re-renders\n2. Implement code splitting with React.lazy()\n3. Optimize images and lazy load them\n4. Use the React DevTools Profiler\n5. Virtualize long lists with react-window\n6. Avoid inline function definitions in render\n\nWould you like me to explain any of these in detail?",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: "gpt-4",
    },
    {
      id: "2",
      title: "TypeScript Best Practices",
      messages: [
        {
          id: "1",
          role: "user",
          content: "What are TypeScript best practices?",
          timestamp: new Date(Date.now() - 86400000),
        },
      ],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
      model: "gpt-4",
    },
  ]);
  const [currentChatId, setCurrentChatId] =
    useState<string>("1");
  const [currentModel, setCurrentModel] = useState("gpt-4");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((c) => c.id === currentChatId);
  const bgPrimary =
    theme === "dark" ? "bg-[#171717]" : "bg-white";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [currentChat?.messages]);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: currentModel,
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = (content: string) => {
    if (!currentChat) {
      handleNewChat();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedChats = chats.map((chat) => {
      if (chat.id === currentChatId) {
        const newMessages = [...chat.messages, userMessage];

        // Simulate AI response
        setTimeout(() => {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              "This is a simulated AI response. In a real application, this would connect to an AI API like OpenAI, Claude, or Gemini to generate intelligent responses based on your input.",
            timestamp: new Date(),
            model: currentModel,
          };

          setChats((prevChats) =>
            prevChats.map((c) =>
              c.id === currentChatId
                ? {
                    ...c,
                    messages: [...c.messages, aiMessage],
                    updatedAt: new Date(),
                  }
                : c,
            ),
          );
        }, 1000);

        return {
          ...chat,
          messages: newMessages,
          title:
            chat.messages.length === 0
              ? content.slice(0, 50)
              : chat.title,
          updatedAt: new Date(),
        };
      }
      return chat;
    });

    setChats(updatedChats);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter((c) => c.id !== chatId));
    if (currentChatId === chatId && chats.length > 1) {
      setCurrentChatId(
        chats.find((c) => c.id !== chatId)?.id || "",
      );
    }
  };

  const handleQuickStart = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleRegenerate = (messageId: string) => {
    // Implement regenerate logic
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col ${bgPrimary}`}>
        {/* Top Bar */}
        <div
          className={`h-14 border-b flex items-center justify-between px-4 ${
            theme === "dark"
              ? "border-[#2D2D2D]"
              : "border-[#E5E5E5]"
          }`}
        >
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </IconButton>
            <ModelSelector
              currentModel={currentModel}
              onSelectModel={setCurrentModel}
            />
          </div>

          <div className="flex items-center gap-2">
            <IconButton>
              <MoreVertical className="w-5 h-5" />
            </IconButton>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!currentChat || currentChat.messages.length === 0 ? (
            <WelcomeScreen onQuickStart={handleQuickStart} />
          ) : (
            <div>
              {currentChat.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={false}
        />
      </div>
    </div>
  );
}

// Helper functions
function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isYesterday(date: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

function isPrevious7Days(date: Date) {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return (
    date > weekAgo &&
    date < today &&
    !isToday(date) &&
    !isYesterday(date)
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}