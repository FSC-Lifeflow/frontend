import { supabase } from '@/lib/supabase';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatar_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  sender?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export interface ChatRoomWithDetails {
  chat_room_id: string;
  chat_name: string;
  chat_type: 'direct' | 'group';
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  participant_ids: string[];
}

class MessageService {
  /**
   * Get all chat rooms for the current user
   */
  async getUserChatRooms(): Promise<ChatRoomWithDetails[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_user_chat_rooms', { user_uuid: user.id });

      if (error) {
        // Check if the function doesn't exist
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('Database function "get_user_chat_rooms" does not exist. Please run the messaging database migration.');
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      throw error;
    }
  }

  /**
   * Get or create a direct chat with another user
   */
  async getOrCreateDirectChat(otherUserId: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_or_create_direct_chat', {
          user1_id: user.id,
          user2_id: otherUserId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting/creating direct chat:', error);
      throw error;
    }
  }

  /**
   * Create a group chat
   */
  async createGroupChat(name: string, participantIds: string[]): Promise<ChatRoom> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the chat room
      const { data: chatRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants (including creator)
      const participants = [user.id, ...participantIds].map(userId => ({
        chat_room_id: chatRoom.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      return chatRoom;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat room
   */
  async getMessages(chatRoomId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('chat_room_id', chatRoomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(chatRoomId: string, content: string): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          content
        })
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark messages in a chat room as read
   */
  async markMessagesAsRead(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .rpc('mark_messages_read', {
          room_id: chatRoomId,
          user_uuid: user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new messages in a chat room
   */
  subscribeToMessages(
    chatRoomId: string,
    callback: (message: Message) => void
  ) {
    const subscription = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(
                id,
                username,
                first_name,
                last_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Subscribe to chat room updates
   */
  subscribeToChatRooms(callback: () => void) {
    const subscription = supabase
      .channel('chat_rooms_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, content: string): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .select(`
          *,
          sender:users(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Add a reaction to a message
   * Note: This is a placeholder. You'll need to create a message_reactions table
   * in your database to fully implement this feature.
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // This would require a message_reactions table in the database
      // For now, this is a placeholder that logs the reaction
      console.log(`User ${user.id} reacted with ${emoji} to message ${messageId}`);
      
      // Uncomment when message_reactions table is created:
      // const { error } = await supabase
      //   .from('message_reactions')
      //   .insert({
      //     message_id: messageId,
      //     user_id: user.id,
      //     emoji
      //   });
      // if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Add participant to group chat
   */
  async addParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: chatRoomId,
          user_id: userId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from group chat
   */
  async removeParticipant(chatRoomId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_room_id', chatRoomId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Leave a chat room
   */
  async leaveChatRoom(chatRoomId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await this.removeParticipant(chatRoomId, user.id);
    } catch (error) {
      console.error('Error leaving chat room:', error);
      throw error;
    }
  }

  /**
   * Update chat room details
   */
  async updateChatRoom(
    chatRoomId: string,
    updates: { name?: string; avatar_url?: string }
  ): Promise<ChatRoom> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatRoomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating chat room:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
