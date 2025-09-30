import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Pin, 
  Trash2, 
  MoreVertical,
  RefreshCw,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChatConversation } from "@/hooks/useChatHistory";

interface ChatHistorySidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string | null) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onPinConversation: (conversationId: string, isPinned: boolean) => void;
  isLoading: boolean;
  className?: string;
}

export function ChatHistorySidebar({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onPinConversation,
  isLoading,
  className
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredConversations = conversations.filter(conversation => 
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleConversationClick = (conversationId: string) => {
    const newSelectedId = conversationId === selectedConversationId ? null : conversationId;
    onConversationSelect(newSelectedId);
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, "h:mm a");
    } else {
      return format(date, "MMM d");
    }
  };
  
  return (
    <div className={cn("bg-card rounded-lg border border-border", className)}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Chat History</h3>
          <Button 
            variant="wellness" 
            size="sm" 
            onClick={onNewConversation}
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            New Chat
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">No conversations yet</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={onNewConversation}
              className="mt-2 text-xs"
            >
              Start a new conversation
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredConversations.map((conversation) => (
              <div key={conversation.id} className="relative">
                <div 
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    selectedConversationId === conversation.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border bg-card hover:border-primary/50"
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {conversation.is_pinned && (
                          <Pin className="w-3 h-3 text-primary" />
                        )}
                        <h4 className="font-medium text-xs truncate">
                          {conversation.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conversation.updated_at)}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinConversation(conversation.id, !conversation.is_pinned);
                          }}
                        >
                          <Pin className="w-3 h-3 mr-2" />
                          {conversation.is_pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
