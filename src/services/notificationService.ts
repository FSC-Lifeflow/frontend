import { supabase } from '../lib/supabase';

/**
 * Notification data structure
 */
export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Notification Service
 * Handles notification functionality
 */
export const notificationService = {
  /**
   * Gets all notifications for the current user
   * @returns Array of notifications
   */
  async getNotifications(): Promise<Notification[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to get notifications:', error);
        throw new Error('Failed to get notifications');
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  },

  /**
   * Marks a notification as read
   * @param notificationId - ID of the notification to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to mark notification as read:', error);
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('❌ Mark notification as read error:', error);
      throw error;
    }
  },

  /**
   * Marks all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) {
        console.error('❌ Failed to mark all notifications as read:', error);
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('❌ Mark all notifications as read error:', error);
      throw error;
    }
  },

  /**
   * Deletes a notification
   * @param notificationId - ID of the notification to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to delete notification:', error);
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  },

  /**
   * Creates a new notification
   * @param notification - Notification data to create
   */
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create notification:', error);
        throw new Error('Failed to create notification');
      }

      return data;
    } catch (error) {
      console.error('❌ Create notification error:', error);
      throw error;
    }
  }
};
