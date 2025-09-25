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
 * Blocked user data structure
 */
export type BlockedUser = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
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

      // Check if the current user is blocked by the receiver
      const isBlocked = await this.isUserBlocked(receiverId);
      if (isBlocked) {
        throw new Error('You cannot send a friend request to this user');
      }

      // Check if a friend request already exists between these users
      const { data: existingRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),` +
          `and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
        );

      if (checkError) {
        console.error('❌ Error checking existing requests:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      // Handle multiple existing requests by using the first one
      const existingRequest = existingRequests && existingRequests.length > 0 ? existingRequests[0] : null;

      // If multiple requests exist, log a warning (we'll clean this up later)
      if (existingRequests && existingRequests.length > 1) {
        console.warn('⚠️ Found multiple friend requests between users. Using the first one.');
      }

      // If a request exists, check its status
      if (existingRequest) {
        // If it's already pending, don't create a new one
        if (existingRequest.status === 'pending') {
          throw new Error('Friend request already pending');
        }
        
        // If it was previously rejected, update it to pending
        if (existingRequest.status === 'rejected') {
          console.log('🔁 Updating previously rejected friend request to pending');
          console.log('Existing request details:', existingRequest);
          
          // Always update the existing request, don't create a new one
          const { data: updatedRequest, error: updateError } = await supabase
            .from('friend_requests')
            .update({ 
              status: 'pending',
              sender_id: currentUser.id,
              receiver_id: receiverId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRequest.id)
            .select('*')
            .single();

          if (updateError) {
            console.error('❌ Failed to update existing friend request:', updateError);
            throw new Error('Failed to update friend request status. Please try again.');
          }

          console.log('✅ Friend request updated successfully:', updatedRequest);

          // Get user info for the notification
          const [senderInfo, receiverInfo] = await Promise.all([
            supabase.from('users').select('id, first_name, last_name, username, email').eq('id', currentUser.id).single(),
            supabase.from('users').select('id, first_name, last_name, username, email').eq('id', receiverId).single()
          ]);

          // Create the complete friend request object
          const friendRequest: FriendRequest = {
            ...updatedRequest,
            sender: senderInfo.data,
            receiver: receiverInfo.data
          };

          // Create notification for the receiver
          await this.createFriendRequestNotification(friendRequest);
          
          return friendRequest;
        }
        
        // If it was accepted, they're already friends
        if (existingRequest.status === 'accepted') {
          throw new Error('You are already friends with this user');
        }
      }

      console.log('✅ No existing request found, creating new friend request...');

      // Create a new friend request
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
        throw new Error(`Failed to send friend request: ${error.message}`);
      }

      console.log('✅ Friend request created:', data);

      // Get sender and receiver info for the notification
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

  /**
   * Remove a friend by updating the friend request record to 'rejected'
   * @param friendId - ID of the friend to remove
   * 
   */
  async unfriend(friendId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('Attempting to unfriend:', { currentUserId: currentUser.id, friendId });

      // Find the friend request to update
      const { data: friendRequest, error: findError } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id')
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId},status.eq.accepted),` +
          `and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id},status.eq.accepted)`
        )
        .maybeSingle();

      if (findError) {
        console.error('Error finding friend request:', findError);
        throw new Error('Failed to find friend relationship');
      }

      if (!friendRequest) {
        console.log('No active friend request found');
        throw new Error('No active friendship found');
      }

      console.log('Updating friend request status to rejected:', friendRequest.id);

      // Update the status to 'rejected' instead of deleting
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', friendRequest.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update friend status');
      }

      console.log('Friend request status updated to rejected');
      
    } catch (error) {
      console.error('Unfriend error:', error);
      throw error;
    }
  },

  /**
   * Blocks a user, preventing them from sending friend requests
   * @param userId - ID of the user to block
   */
  async blockUser(userId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Check if already blocked
      const { data: existingBlock, error: checkError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Error checking block status: ${checkError.message}`);
      }

      if (existingBlock) {
        throw new Error('User is already blocked');
      }

      // Create the block
      const { error } = await supabase
        .from('user_blocks')
        .insert([
          {
            blocker_id: currentUser.id,
            blocked_id: userId,
          },
        ]);

      if (error) {
        throw new Error(`Failed to block user: ${error.message}`);
      }

      // Reject any pending friend requests from the blocked user
      await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('sender_id', userId)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');

    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  },

  /**
   * Unblocks a user
   * @param userId - ID of the user to unblock
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId);

      if (error) {
        throw new Error(`Failed to unblock user: ${error.message}`);
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  },

  /**
   * Checks if a user is blocked by the current user
   * @param userId - ID of the user to check
   * @returns True if the user is blocked, false otherwise
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking block status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  },

  /**
   * Gets a list of users blocked by the current user
   * @returns Array of blocked users with their information
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          created_at,
          blocked_user:blocked_id (
            id,
            first_name,
            last_name,
            username,
            email
          )
        `)
        .eq('blocker_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get blocked users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      throw error;
    }
  },

  /**
   * Checks if the current user is blocked by another user
   * @param userId - ID of the user to check
   * @returns True if the current user is blocked, false otherwise
   */
  async isBlockedByUser(userId: string): Promise<boolean> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', userId)
        .eq('blocked_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking if blocked by user:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if blocked by user:', error);
      return false;
    }
  }
};
