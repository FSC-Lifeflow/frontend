import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { EventsSidebar } from "./EventsSidebar";
import { X, Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { events } = useGoogleCalendar();
  const {
    conversations,
    loading: chatHistoryLoading,
    createConversation,
    loadConversationMessages,
    addMessageToConversation,
    deleteConversation,
    togglePinConversation,
    clearCurrentConversation
  } = useChatHistory();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. I've been analyzing your recent activity and I'm impressed with your consistency! How are you feeling about your progress this week?`,
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<CalendarEvent[]>([]);

  // Keep eventsRef updated with latest events
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendChatRequest = async (userMessage: string, selectedEvent: CalendarEvent | null = null) => {
    try {
      const payload: any = {
        timestamp: new Date().toISOString(),
        action: 'chat_message',
        message: userMessage,
        source: 'chat_interface'
      };
  
      // Include selected event if available
      if (selectedEvent) {
        payload.selected_event = {
          id: selectedEvent.id,
          summary: selectedEvent.summary,
          description: selectedEvent.description,
          start: selectedEvent.start,
          end: selectedEvent.end,
          location: selectedEvent.location,
          attendees: selectedEvent.attendees
        };
      }
  
      const response = await fetch(`/api/webhook/${import.meta.env.VITE_WEBHOOK_MASTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (response.ok) {
        console.log('Chat webhook called successfully', selectedEvent ? 'with selected event' : '');
        const responseJSON = await response.json();
        return responseJSON.output;
      } else {
        console.error('Chat webhook call failed:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error calling chat webhook:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;
  
    const userMessageContent = inputValue;
    const timestamp = new Date();
    
    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: userMessageContent,
      isUser: true,
      timestamp,
    };
  
    setMessages(prev => [...prev, tempUserMessage]);
    setInputValue("");
    setIsTyping(true);
  
    try {
      // Step 1: Create conversation if this is the first message (no conversation selected)
      let conversationId = selectedConversationId;
      
      if (!conversationId) {
        // Generate title from first message (first 50 chars)
        const title = userMessageContent.length > 50 
          ? userMessageContent.substring(0, 47) + '...'
          : userMessageContent;
        
        const newConversation = await createConversation(title, []);
        
        if (newConversation) {
          conversationId = newConversation.id;
          setSelectedConversationId(conversationId);
        } else {
          throw new Error('Failed to create conversation');
        }
      }
  
      // Step 2: Save user message to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: userMessageContent,
          is_user: true,
          timestamp,
        });
      }

      // Use eventsRef.current to get the latest events data
      const selectedEvent = selectedEventId 
        ? eventsRef.current.find(event => event.id === selectedEventId) || null
        : null;

      console.log('Sending message with event:', {
        selectedEventId,
        selectedEvent: selectedEvent ? {
          summary: selectedEvent.summary,
          start: selectedEvent.start,
          end: selectedEvent.end
        } : 'none',
        eventsCount: eventsRef.current.length,
        latestEventsTimestamp: new Date().toISOString()
      });
  
      // Step 3: Get AI response from webhook
      const webhookResponse = await sendChatRequest(userMessageContent, selectedEvent);
      
      let aiResponseContent = "I'm sorry, I'm having trouble processing your request right now. Please try again.";
      
      if (webhookResponse) {
        aiResponseContent = webhookResponse;
      }
      
      const aiTimestamp = new Date();
      const aiResponse: Message = {
        id: `temp-ai-${Date.now()}`,
        content: aiResponseContent,
        isUser: false,
        timestamp: aiTimestamp,
      };
  
      setMessages(prev => [...prev, aiResponse]);
  
      // Step 4: Save AI response to database
      if (conversationId) {
        await addMessageToConversation(conversationId, {
          content: aiResponseContent,
          is_user: false,
          timestamp: aiTimestamp,
        });
      }
  
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        content: "I'm experiencing technical difficulties. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
  
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    clearCurrentConversation();
    setMessages([{
      id: "1",
      content: `Hi ${user?.first_name || 'there'}! 👋 I'm your AI wellness coach. How can I help you today?`,
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const handleConversationSelect = async (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    if (conversationId) {
      const conversation = await loadConversationMessages(conversationId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: msg.timestamp
        })));
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    if (selectedConversationId === conversationId) {
      handleNewConversation();
    }
  };

  const handlePinConversation = async (conversationId: string, isPinned: boolean) => {
    await togglePinConversation(conversationId, isPinned);
  };

  const handleEventSelect = (eventId: string | null) => {
    setSelectedEventId(eventId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1600px] h-[800px] flex gap-4 animate-fade-in">
        {/* Chat History Sidebar - Left */}
        <div className="w-80 flex-shrink-0">
          <ChatHistorySidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
            isLoading={chatHistoryLoading}
            className="h-full"
          />
        </div>

        {/* Main Chat Interface - Center */}
        <div className="flex-1 bg-card rounded-lg border border-border p-6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Wellness Coach</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online & ready to help
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.isUser 
                    ? "bg-gradient-motivation" 
                    : "bg-gradient-primary"
                )}>
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={cn(
                  "max-w-[80%] rounded-lg p-3 animate-fade-in",
                  message.isUser
                    ? "bg-gradient-motivation text-white ml-auto"
                    : "bg-muted text-foreground"
                )}>
                  <p className="text-sm">{message.content}</p>
                  <p className={cn(
                    "text-xs mt-2 opacity-70",
                    message.isUser ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-lg p-3 animate-fade-in">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your progress, schedule, or get wellness tips..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                variant="wellness" 
                size="icon"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick suggestions */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                "How's my sleep affecting my workouts?",
                "Suggest a workout for today",
                "Show me this week's trends"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="zen"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue(suggestion)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Sidebar - Right */}
        <div className="w-80 flex-shrink-0">
          <EventsSidebar
            onEventSelect={handleEventSelect}
            selectedEventId={selectedEventId}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}