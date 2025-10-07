import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  timestamp: Date;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  is_pinned: boolean;
  messages?: ChatMessage[];
}

export function useChatHistory() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations for the current user
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load all conversations for the current user
  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setConversations(data.map(conv => ({
        ...conv,
        created_at: new Date(conv.created_at),
        updated_at: new Date(conv.updated_at)
      })));
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (title: string, initialMessages: Omit<ChatMessage, 'id'>[]) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // Insert the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert([{ 
          user_id: user.id, 
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (conversationError) throw conversationError;
      
      // Insert the initial messages
      if (initialMessages.length > 0) {
        const messagesToInsert = initialMessages.map(msg => ({
          conversation_id: conversationData.id,
          content: msg.content,
          is_user: msg.is_user,
          timestamp: msg.timestamp.toISOString()
        }));
        
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .insert(messagesToInsert);
        
        if (messagesError) throw messagesError;
      }
      
      // Add the new conversation to state
      const newConversation = {
        ...conversationData,
        created_at: new Date(conversationData.created_at),
        updated_at: new Date(conversationData.updated_at)
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (conversationError) throw conversationError;
      
      // Get the messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      const conversation = {
        ...conversationData,
        created_at: new Date(conversationData.created_at),
        updated_at: new Date(conversationData.updated_at),
        messages: messagesData.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
      
      setCurrentConversation(conversation);
      return conversation;
    } catch (err) {
      console.error('Error loading conversation messages:', err);
      setError('Failed to load conversation messages');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a message to the current conversation
  const addMessageToConversation = async (
    conversationId: string, 
    message: Omit<ChatMessage, 'id'>
  ) => {
    if (!user) return null;
    
    try {
      // Insert the message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          content: message.content,
          is_user: message.is_user,
          timestamp: message.timestamp.toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the conversation's updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      // Update local state if this is the current conversation
      if (currentConversation?.id === conversationId) {
        const newMessage = {
          ...data,
          timestamp: new Date(data.timestamp)
        };
        
        setCurrentConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            updated_at: new Date(),
            messages: [...(prev.messages || []), newMessage]
          };
        });
      }
      
      // Update the conversations list to reflect the new updated_at time
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === conversationId) {
            return { ...conv, updated_at: new Date() };
          }
          return conv;
        });
        
        // Sort by updated_at
        return updatedConversations.sort((a, b) => 
          b.updated_at.getTime() - a.updated_at.getTime()
        );
      });
      
      return data;
    } catch (err) {
      console.error('Error adding message:', err);
      setError('Failed to add message');
      return null;
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
      return false;
    }
  };

  // Toggle pin status for a conversation
  const togglePinConversation = async (conversationId: string, isPinned: boolean) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_pinned: isPinned })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === conversationId) {
            return { ...conv, is_pinned: isPinned };
          }
          return conv;
        });
        
        // Sort by pinned status and then by updated_at
        return updatedConversations.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return b.updated_at.getTime() - a.updated_at.getTime();
        });
      });
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => {
          if (!prev) return null;
          return { ...prev, is_pinned: isPinned };
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error toggling pin status:', err);
      setError('Failed to update conversation');
      return false;
    }
  };

  // Clear current conversation selection
  const clearCurrentConversation = () => {
    setCurrentConversation(null);
  };

  return {
    conversations,
    currentConversation,
    loading,
    error,
    loadConversations,
    createConversation,
    loadConversationMessages,
    addMessageToConversation,
    deleteConversation,
    togglePinConversation,
    clearCurrentConversation
  };
}
