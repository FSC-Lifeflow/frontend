import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  messageService, 
  type ChatRoomWithDetails, 
  type Message 
} from "@/services/messageService";
import { friendService } from "@/services/friendService";
import { type SearchUser } from "@/services/userService";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Users, Search, Plus, Send, Loader2, Check, MoreVertical, Edit2, Trash2, Smile, Image as ImageIcon, Paperclip, X, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<SearchUser | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoomName, setEditingRoomName] = useState("");
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [participants, setParticipants] = useState<SearchUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const reactionSubscriptionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat rooms
  useEffect(() => {
    loadChatRooms();
  }, []);

  // Load friends when modal opens
  useEffect(() => {
    if (showNewChatModal) {
      loadFriends();
    }
  }, [showNewChatModal]);

  // Handle navigation state - auto-select chat if provided
  useEffect(() => {
    const state = location.state as { selectedChatId?: string } | null;
    if (state?.selectedChatId && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.chat_room_id === state.selectedChatId);
      if (room) {
        setSelectedRoom(room);
      }
    }
  }, [location.state, chatRooms]);

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
      loadParticipants(selectedRoom.participant_ids);
      markAsRead(selectedRoom.chat_room_id);

      // Subscribe to new messages and updates
      subscriptionRef.current = messageService.subscribeToMessages(
        selectedRoom.chat_room_id,
        (message, event) => {
          if (event === 'INSERT') {
            setMessages(prev => {
              // Avoid duplicates - check if message already exists
              const exists = prev.some(msg => msg.id === message.id);
              if (exists) return prev;
              return [...prev, message];
            });
            scrollToBottom();
          } else if (event === 'UPDATE') {
            setMessages(prev => 
              prev.map(msg => msg.id === message.id ? message : msg)
            );
          } else if (event === 'DELETE') {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === message.id 
                  ? { ...msg, is_deleted: true, content: 'This message was deleted' }
                  : msg
              )
            );
          }
          
          // Reload chat rooms to update last message preview
          loadChatRooms();
        }
      );

      // Subscribe to reaction changes
      reactionSubscriptionRef.current = messageService.subscribeToReactions(
        selectedRoom.chat_room_id,
        (messageId, reactions) => {
          console.log('🎉 Reaction update received for message:', messageId, reactions);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId ? { ...msg, reactions } : msg
            )
          );
        }
      );
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (reactionSubscriptionRef.current) {
        reactionSubscriptionRef.current.unsubscribe();
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
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        toast.error('Failed to load chat rooms. Please check if the database is set up correctly.');
      }, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async (participantIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, avatar_url')
        .in('id', participantIds);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const msgs = await messageService.getMessages(roomId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
      setTimeout(() => {
        toast.error('Failed to load messages');
      }, 0);
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
      const sentMessage = await messageService.sendMessage(selectedRoom.chat_room_id, newMessage.trim());
      
      // Add message to local state immediately (optimistic update)
      setMessages(prev => [...prev, sentMessage]);
      
      // Clear input and scroll to bottom
      setNewMessage("");
      scrollToBottom();
      
      // Reload chat rooms to update last message preview
      loadChatRooms();
    } catch (error) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        toast.error('Failed to send message');
      }, 0);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSaveEdit();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // In a real implementation, you would broadcast typing status via Supabase realtime
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setNewMessage(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
    setNewMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !newMessage.trim()) return;

    try {
      setIsSending(true);
      // Update message in database
      await messageService.updateMessage(editingMessageId, newMessage.trim());
      
      // Update local state
      setMessages(messages.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: newMessage.trim(), updated_at: new Date().toISOString() }
          : msg
      ));
      
      handleCancelEdit();
      setTimeout(() => {
        toast.success('Message updated');
      }, 0);
    } catch (error) {
      console.error('Error updating message:', error);
      setTimeout(() => {
        toast.error('Failed to update message');
      }, 0);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await messageService.deleteMessage(messageId);
      
      // Update local state
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, is_deleted: true, content: 'This message was deleted' }
          : msg
      ));
      
      setTimeout(() => {
        toast.success('Message deleted');
      }, 0);
    } catch (error) {
      console.error('Error deleting message:', error);
      setTimeout(() => {
        toast.error('Failed to delete message');
      }, 0);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      // The database will handle the toggle and real-time subscription will update UI
      await messageService.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      setTimeout(() => {
        toast.error('Failed to add reaction');
      }, 0);
    }
  };

  const getReactionUserNames = (reaction: any) => {
    // Use userDetails from the reaction data (populated by database)
    const userNames: string[] = [];
    
    if (reaction.userDetails && reaction.userDetails.length > 0) {
      reaction.userDetails.forEach((userDetail: any) => {
        if (userDetail.id === user?.id) {
          userNames.push('You');
        } else {
          userNames.push(userDetail.name);
        }
      });
    } else {
      // Fallback if userDetails not available
      reaction.users.forEach((userId: string) => {
        if (userId === user?.id) {
          userNames.push('You');
        } else {
          userNames.push('Someone');
        }
      });
    }
    
    return userNames;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const friendsList = await friendService.getFriends();
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
      setTimeout(() => {
        toast.error('Failed to load friends');
      }, 0);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleStartNewChat = async () => {
    if (isGroupChat) {
      // Handle group chat creation
      if (selectedMembers.length < 2) {
        setTimeout(() => {
          toast.error('Please select at least 2 members for a group chat');
        }, 0);
        return;
      }
      if (!groupName.trim()) {
        setTimeout(() => {
          toast.error('Please enter a group name');
        }, 0);
        return;
      }

      try {
        setIsCreatingChat(true);
        
        const memberIds = selectedMembers.map(m => m.id);
        const chatRoom = await messageService.createGroupChat(groupName.trim(), memberIds);
        
        // Reload chat rooms
        const rooms = await messageService.getUserChatRooms();
        setChatRooms(rooms);
        
        // Find and select the chat room
        const room = rooms.find(r => r.chat_room_id === chatRoom.id);
        if (room) {
          setSelectedRoom(room);
        }
        
        // Close modal and reset
        setShowNewChatModal(false);
        setSelectedMembers([]);
        setGroupName('');
        setIsGroupChat(false);
        
        setTimeout(() => {
          toast.success(`Group chat "${groupName}" created`);
        }, 0);
      } catch (error) {
        console.error('Error creating group chat:', error);
        setTimeout(() => {
          toast.error('Failed to create group chat. Please try again.');
        }, 0);
      } finally {
        setIsCreatingChat(false);
      }
    } else {
      // Handle direct chat creation
      if (!selectedFriend) return;

      try {
        setIsCreatingChat(true);
        
        const chatRoomId = await messageService.getOrCreateDirectChat(selectedFriend.id);
        
        // Reload chat rooms
        const rooms = await messageService.getUserChatRooms();
        setChatRooms(rooms);
        
        // Find and select the chat room
        const room = rooms.find(r => r.chat_room_id === chatRoomId);
        if (room) {
          setSelectedRoom(room);
        }
        
        // Close modal and reset
        setShowNewChatModal(false);
        setSelectedFriend(null);
        
        setTimeout(() => {
          toast.success(`Chat with ${selectedFriend.first_name || selectedFriend.username} opened`);
        }, 0);
      } catch (error) {
        console.error('Error starting chat:', error);
        setTimeout(() => {
          toast.error('Failed to start chat. Please try again.');
        }, 0);
      } finally {
        setIsCreatingChat(false);
      }
    }
  };

  const toggleMemberSelection = (friend: SearchUser) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === friend.id);
      if (isSelected) {
        return prev.filter(m => m.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleEditRoomName = () => {
    if (selectedRoom) {
      setEditingRoomName(selectedRoom.chat_name);
      setShowEditRoomModal(true);
    }
  };

  const handleUpdateRoomName = async () => {
    if (!selectedRoom || !editingRoomName.trim()) return;

    try {
      setIsUpdatingRoom(true);
      await messageService.updateChatRoomName(selectedRoom.chat_room_id, editingRoomName.trim());
      
      // Update local state
      setSelectedRoom({ ...selectedRoom, chat_name: editingRoomName.trim() });
      setChatRooms(prev => 
        prev.map(room => 
          room.chat_room_id === selectedRoom.chat_room_id 
            ? { ...room, chat_name: editingRoomName.trim() }
            : room
        )
      );
      
      setShowEditRoomModal(false);
      setTimeout(() => {
        toast.success('Chat name updated');
      }, 0);
    } catch (error) {
      console.error('Error updating room name:', error);
      setTimeout(() => {
        toast.error('Failed to update chat name');
      }, 0);
    } finally {
      setIsUpdatingRoom(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Room List */}
          <Card className="lg:col-span-1 flex flex-col h-[calc(100vh-200px)]">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-xl">Chats</CardTitle>
                <Button 
                  size="sm" 
                  variant="wellness"
                  onClick={() => setShowNewChatModal(true)}
                >
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
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
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
                    <Button 
                      variant="wellness" 
                      size="sm"
                      onClick={() => setShowNewChatModal(true)}
                    >
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
          <Card className="lg:col-span-2 flex flex-col">
            <CardContent className="p-0 flex flex-col h-[calc(100vh-200px)]">
              {selectedRoom ? (
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="border-b p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar with Participants Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer hover:opacity-80 transition-opacity">
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
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            <div className="px-2 py-1.5 text-sm font-semibold">
                              {selectedRoom.chat_type === 'group' ? 'Group Members' : 'Participants'} ({participants.length})
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {participants.map((participant) => (
                                <DropdownMenuItem key={participant.id} className="cursor-default focus:bg-accent">
                                  <div className="flex items-center gap-3 w-full">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={participant.avatar_url} />
                                      <AvatarFallback className="text-xs">
                                        {participant.first_name?.[0] || participant.username?.[0] || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {participant.first_name && participant.last_name
                                          ? `${participant.first_name} ${participant.last_name}`
                                          : participant.username}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        @{participant.username}
                                      </p>
                                    </div>
                                    {participant.id === user?.id && (
                                      <Badge variant="secondary" className="text-xs">You</Badge>
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <div>
                          <h3 className="font-semibold">{selectedRoom.chat_name}</h3>
                          {selectedRoom.chat_type === 'group' && (
                            <p className="text-sm text-muted-foreground">
                              {selectedRoom.participant_ids.length} members
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit Chat Name Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditRoomName}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4 overflow-y-auto">
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
                          const isDeleted = message.is_deleted;
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 group ${
                                isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                              }`}
                              onMouseEnter={() => setHoveredMessageId(message.id)}
                              onMouseLeave={() => setHoveredMessageId(null)}
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
                                <div className="relative">
                                  <div
                                    className={`rounded-lg px-4 py-2 ${
                                      isOwnMessage
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    } ${isDeleted ? 'opacity-60 italic' : ''}`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  </div>
                                  
                                  {/* Message Actions */}
                                  {!isDeleted && hoveredMessageId === message.id && (
                                    <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex items-center gap-1 px-2`}>
                                      {/* Reaction Button */}
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                          >
                                            <Smile className="w-4 h-4" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2">
                                          <div className="flex gap-1">
                                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                                              <Button
                                                key={emoji}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-lg"
                                                onClick={() => handleReaction(message.id, emoji)}
                                              >
                                                {emoji}
                                              </Button>
                                            ))}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      
                                      {/* Edit/Delete for own messages */}
                                      {isOwnMessage && (
                                        <DropdownMenu modal={false}>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 hover:bg-accent"
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent 
                                            align={isOwnMessage ? "end" : "start"}
                                            className="w-48"
                                            sideOffset={5}
                                          >
                                            <DropdownMenuItem 
                                              onClick={() => handleEditMessage(message)}
                                              className="cursor-pointer"
                                            >
                                              <Edit2 className="w-4 h-4 mr-2" />
                                              Edit Message
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => handleDeleteMessage(message.id)}
                                              className="text-destructive cursor-pointer focus:text-destructive"
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete Message
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Reactions Display */}
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <TooltipProvider>
                                      {message.reactions.map((reaction) => {
                                        const userNames = getReactionUserNames(reaction);
                                        const tooltipText = userNames.length <= 3
                                          ? userNames.join(', ')
                                          : `${userNames.slice(0, 3).join(', ')} and ${userNames.length - 3} more`;
                                        
                                        return (
                                          <Tooltip key={reaction.emoji} delayDuration={200}>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => handleReaction(message.id, reaction.emoji)}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                  reaction.hasReacted
                                                    ? 'bg-primary/20 border border-primary/40 hover:bg-primary/30'
                                                    : 'bg-muted hover:bg-muted/80 border border-transparent'
                                                }`}
                                              >
                                                <span className="text-sm">{reaction.emoji}</span>
                                                <span className="font-medium">{reaction.count}</span>
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                              <p className="text-sm">{tooltipText}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      })}
                                    </TooltipProvider>
                                  </div>
                                )}
                                
                                <span className="text-xs text-muted-foreground mt-1">
                                  {formatMessageTime(message.created_at)}
                                  {message.updated_at !== message.created_at && !isDeleted && ' (edited)'}
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
                  <div className="border-t p-4 flex-shrink-0">
                    {/* Typing Indicator */}
                    {otherUserTyping && (
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="animate-pulse">{otherUserTyping} is typing</span>
                        <span className="flex gap-1">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                      </div>
                    )}
                    
                    {/* Editing Mode Banner */}
                    {editingMessageId && (
                      <div className="flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Edit2 className="w-4 h-4" />
                          <span>Editing message</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-6 px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        className="flex-1"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={isSending}
                      />
                      <Button 
                        variant="wellness" 
                        onClick={editingMessageId ? handleSaveEdit : handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                      >
                        {editingMessageId ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
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

        {/* New Chat Modal */}
        <Dialog open={showNewChatModal} onOpenChange={(open) => {
          setShowNewChatModal(open);
          if (!open) {
            // Reset state when closing
            setIsGroupChat(false);
            setSelectedFriend(null);
            setSelectedMembers([]);
            setGroupName('');
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Start a New Chat</DialogTitle>
              <DialogDescription>
                {isGroupChat ? 'Create a group chat with multiple friends' : 'Select a friend to start a conversation with'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col max-h-[70vh]">
              {/* Chat Type Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={!isGroupChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsGroupChat(false);
                    setSelectedMembers([]);
                    setGroupName('');
                  }}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Direct Chat
                </Button>
                <Button
                  variant={isGroupChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsGroupChat(true);
                    setSelectedFriend(null);
                  }}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Group Chat
                </Button>
              </div>

              {/* Group Name Input (only for group chats) */}
              {isGroupChat && (
                <div className="mb-4">
                  <Input
                    placeholder="Enter group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              {isLoadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">No friends yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add friends from the Social page to start chatting
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 space-y-4 py-4">
                    <Command className="border rounded-lg">
                      <CommandInput placeholder="Search friends..." />
                      <CommandList>
                        <CommandEmpty>No friends found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[300px]">
                            {friends.map((friend) => {
                              const isSelected = isGroupChat 
                                ? selectedMembers.some(m => m.id === friend.id)
                                : selectedFriend?.id === friend.id;
                              
                              return (
                                <CommandItem
                                  key={friend.id}
                                  onSelect={() => {
                                    if (isGroupChat) {
                                      toggleMemberSelection(friend);
                                    } else {
                                      setSelectedFriend(friend);
                                    }
                                  }}
                                  className={`cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={friend.avatar_url} />
                                      <AvatarFallback>
                                        {friend.first_name?.[0] || friend.username?.[0] || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-semibold">
                                        {friend.first_name && friend.last_name
                                          ? `${friend.first_name} ${friend.last_name}`
                                          : friend.username}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        @{friend.username}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-5 h-5 text-primary" />
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </ScrollArea>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowNewChatModal(false);
                        setSelectedFriend(null);
                        setSelectedMembers([]);
                        setGroupName('');
                        setIsGroupChat(false);
                      }}
                      disabled={isCreatingChat}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="wellness"
                      className="flex-1"
                      onClick={handleStartNewChat}
                      disabled={
                        isCreatingChat ||
                        (isGroupChat ? (selectedMembers.length < 2 || !groupName.trim()) : !selectedFriend)
                      }
                    >
                      {isCreatingChat ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : isGroupChat ? (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Create Group {selectedMembers.length > 0 && `(${selectedMembers.length})`}
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Start Chat
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Room Name Modal */}
        <Dialog open={showEditRoomModal} onOpenChange={setShowEditRoomModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Chat Name</DialogTitle>
              <DialogDescription>
                Change the name of this chat room
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="room-name" className="text-sm font-medium">
                  Chat Name
                </label>
                <Input
                  id="room-name"
                  value={editingRoomName}
                  onChange={(e) => setEditingRoomName(e.target.value)}
                  placeholder="Enter chat name..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && editingRoomName.trim()) {
                      handleUpdateRoomName();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditRoomModal(false)}
                disabled={isUpdatingRoom}
              >
                Cancel
              </Button>
              <Button
                variant="wellness"
                className="flex-1"
                onClick={handleUpdateRoomName}
                disabled={!editingRoomName.trim() || isUpdatingRoom}
              >
                {isUpdatingRoom ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
