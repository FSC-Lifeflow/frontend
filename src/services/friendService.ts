import { supabase } from '../lib/supabase';

/**
 * Friend request status types
 */
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Friend request data structure
 */
export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
};

/**
 * User data structure
 */
export type SearchUser = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

/**
 * Friend Service
 * Handles friend request functionality and friendship management
 */
export const friendService = {
  /**
   * Sends a friend request to another user
   * @param receiverId - ID of the user to send the request to
   * @returns The created friend request
   */
  async sendFriendRequest(receiverId: string): Promise<FriendRequest> {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 Sending friend request from:', currentUser.id, 'to:', receiverId);

      // Check if a friend request already exists between these users
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing requests:', checkError);
        console.error('❌ Error details:', {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint
        });
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (existingRequest) {
        throw new Error('Friend request already exists between these users');
      }

      console.log('✅ No existing request found, creating new friend request...');

      // Create the friend request (simplified without joins)
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to send friend request:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to send friend request: ${error.message}`);
      }

      console.log('✅ Friend request created:', data);

      // Get sender and receiver info separately for the notification
      const [senderInfo, receiverInfo] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, username, email').eq('id', currentUser.id).single(),
        supabase.from('users').select('id, first_name, last_name, username, email').eq('id', receiverId).single()
      ]);

      // Create the complete friend request object
      const friendRequest: FriendRequest = {
        ...data,
        sender: senderInfo.data,
        receiver: receiverInfo.data
      };

      // Create notification for the receiver
      await this.createFriendRequestNotification(friendRequest);

      return friendRequest;
    } catch (error) {
      console.error('❌ Send friend request error:', error);
      throw error;
    }
  },

  /**
   * Creates a notification for a friend request
   * @param friendRequest - The friend request data
   */
  async createFriendRequestNotification(friendRequest: FriendRequest): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: friendRequest.receiver_id,
          type: 'friend_request',
          title: 'Friend Request',
          message: `${friendRequest.sender?.first_name} ${friendRequest.sender?.last_name} sent you a friend request`,
          data: {
            friend_request_id: friendRequest.id,
            sender_id: friendRequest.sender_id
          },
          read: false
        });

      if (error) {
        console.error('❌ Failed to create friend request notification:', error);
      }
    } catch (error) {
      console.error('❌ Create notification error:', error);
    }
  },

  /**
   * Gets pending friend requests for the current user
   * @returns Array of pending friend requests
   */
  async getPendingFriendRequests(): Promise<FriendRequest[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:users!sender_id(id, first_name, last_name, username, email),
          receiver:users!receiver_id(id, first_name, last_name, username, email)
        `)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to get pending friend requests:', error);
        throw new Error('Failed to get pending friend requests');
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get pending friend requests error:', error);
      throw error;
    }
  },

  /**
   * Accepts a friend request
   * @param requestId - ID of the friend request to accept
   */
  async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Failed to accept friend request:', error);
        throw new Error('Failed to accept friend request');
      }
    } catch (error) {
      console.error('❌ Accept friend request error:', error);
      throw error;
    }
  },

  /**
   * Rejects a friend request
   * @param requestId - ID of the friend request to reject
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Failed to reject friend request:', error);
        throw new Error('Failed to reject friend request');
      }
    } catch (error) {
      console.error('❌ Reject friend request error:', error);
      throw error;
    }
  },

  /**
   * Gets the friendship status between two users
   * @param userId - ID of the other user
   * @returns The friendship status or null if no relationship exists
   */
  async getFriendshipStatus(userId: string): Promise<FriendRequestStatus | null> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return null;
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select('status, sender_id, receiver_id')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (error) {
        console.error('❌ Failed to get friendship status:', error);
        return null;
      }

      return data?.status || null;
    } catch (error) {
      console.error('❌ Get friendship status error:', error);
      return null;
    }
  },

  /**
   * Gets all friends for the current user (accepted friend requests)
   * @returns Array of friends with their user information
   */
  async getFriends(): Promise<SearchUser[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      // Get all accepted friend requests where current user is either sender or receiver
      const { data: friendRequests, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('❌ Failed to get friend requests:', error);
        throw new Error('Failed to get friends');
      }

      if (!friendRequests || friendRequests.length === 0) {
        return [];
      }

      // Extract friend IDs (the other person in each relationship)
      const friendIds = friendRequests.map(request => 
        request.sender_id === currentUser.id ? request.receiver_id : request.sender_id
      );

      // Get user information for all friends
      const { data: friends, error: friendsError } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, email, created_at')
        .in('id', friendIds);

      if (friendsError) {
        console.error('❌ Failed to get friends info:', friendsError);
        throw new Error('Failed to get friends information');
      }

      return friends || [];
    } catch (error) {
      console.error('❌ Get friends error:', error);
      throw error;
    }
  },
};
