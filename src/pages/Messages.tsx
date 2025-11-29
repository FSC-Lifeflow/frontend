import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  messageService, 
  type ChatRoomWithDetails, 
  type Message 
} from "@/services/messageService";
import { MessageSquare, Users, Search, Plus, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  // Fetch chat rooms
  useEffect(() => {
    loadChatRooms();
  }, []);

  // Subscribe to real-time updates for chat rooms
  useEffect(() => {
    const subscription = messageService.subscribeToChatRooms(() => {
      loadChatRooms();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load messages when room is selected
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.chat_room_id);
      markAsRead(selectedRoom.chat_room_id);

      // Subscribe to new messages
      subscriptionRef.current = messageService.subscribeToMessages(
        selectedRoom.chat_room_id,
        (newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      );
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [selectedRoom]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatRooms = async () => {
    try {
      setIsLoading(true);
      const rooms = await messageService.getUserChatRooms();
      setChatRooms(rooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast.error('Failed to load chat rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const msgs = await messageService.getMessages(roomId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markAsRead = async (roomId: string) => {
    try {
      await messageService.markMessagesAsRead(roomId);
      // Refresh chat rooms to update unread count
      loadChatRooms();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || isSending) return;

    try {
      setIsSending(true);
      await messageService.sendMessage(selectedRoom.chat_room_id, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const filteredRooms = chatRooms.filter(room =>
    room.chat_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-50 via-zen-50 to-motivation-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-muted-foreground">
            Chat with friends and groups
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Chat Room List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-xl">Chats</CardTitle>
                <Button size="sm" variant="wellness">
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-360px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredRooms.length === 0 && searchQuery === "" ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No chats yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a conversation with your friends or create a group chat
                    </p>
                    <Button variant="wellness" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Start a Chat
                    </Button>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Search className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try searching with different keywords
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredRooms.map((room) => (
                      <button
                        key={room.chat_room_id}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          selectedRoom?.chat_room_id === room.chat_room_id
                            ? 'bg-primary/10'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={room.avatar_url} />
                            <AvatarFallback>
                              {room.chat_type === 'group' ? (
                                <Users className="w-4 h-4" />
                              ) : (
                                room.chat_name.substring(0, 2).toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {room.unread_count > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                            >
                              {room.unread_count > 9 ? '9+' : room.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold truncate">
                              {room.chat_name}
                            </span>
                            {room.last_message_time && (
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(room.last_message_time)}
                              </span>
                            )}
                          </div>
                          {room.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {room.last_message}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 h-full">
              {selectedRoom ? (
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="border-b p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedRoom.avatar_url} />
                        <AvatarFallback>
                          {selectedRoom.chat_type === 'group' ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            selectedRoom.chat_name.substring(0, 2).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedRoom.chat_name}</h3>
                        {selectedRoom.chat_type === 'group' && (
                          <p className="text-sm text-muted-foreground">
                            {selectedRoom.participant_ids.length} members
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isOwnMessage = message.sender_id === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${
                                isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              {!isOwnMessage && (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={message.sender?.avatar_url} />
                                  <AvatarFallback>
                                    {message.sender?.first_name?.[0] || message.sender?.username?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`flex flex-col max-w-[70%] ${
                                  isOwnMessage ? 'items-end' : 'items-start'
                                }`}
                              >
                                {!isOwnMessage && (
                                  <span className="text-xs text-muted-foreground mb-1">
                                    {message.sender?.first_name || message.sender?.username}
                                  </span>
                                )}
                                <div
                                  className={`rounded-lg px-4 py-2 ${
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground mt-1">
                                  {formatMessageTime(message.created_at)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        className="flex-1"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isSending}
                      />
                      <Button 
                        variant="wellness" 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">Select a chat</h3>
                    <p className="text-sm">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
