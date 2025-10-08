import { useState, useEffect } from "react";
// Custom layout and card components for consistent UI
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import FriendProfile from "@/components/FriendProfile";
// UI components from shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, Upload, Save, Bell, X, Check, UserX, Loader2, Users, Ban, UserMinus, ChevronDown, ChevronUp, Calendar, Clock, MapPin, FileText } from "lucide-react";
// Custom hooks and services
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { authService } from "@/services/authService";
import { notificationService, type Notification } from "@/services/notificationService";
import { friendService, type SearchUser } from "@/services/friendService";

/**
 * Profile component - Displays and allows editing of user profile information
 */
export default function Profile() {
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    created_at: string;
  }>>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);

  // Profile data with default values
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    profilePicture: "",
    fitnessLevel: "",
    primaryGoals: "",
    exercisePreferences: "",
    weeklyFrequency: "",
    sessionDuration: "",
    equipmentAccess: "",
    physicalLimitations: "",
    socialPrivacy: true,
    activitySharing: true
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setUserId(user.id);
        
        // Debug logging to see what's actually in the database
        console.log('🔍 User data from database:', user);
        console.log('🔍 social_privacy value:', user.social_privacy);
        console.log('🔍 social_privacy type:', typeof user.social_privacy);
        
        // Check localStorage for activity_sharing override (temporary until DB is migrated)
        const localActivitySharing = localStorage.getItem(`activity_sharing_${user.id}`);
        const activitySharingValue = localActivitySharing !== null 
          ? localActivitySharing === 'true'
          : (user.activity_sharing ?? true);
        
        // Update profile data with user information
        setProfileData(prev => ({
          ...prev,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          fitnessLevel: user.fitness_level || "",
          primaryGoals: user.primary_goals || "",
          exercisePreferences: user.exercise_preferences || "",
          weeklyFrequency: user.weekly_frequency || "",
          sessionDuration: user.session_duration || "",
          equipmentAccess: user.equipment_access || "",
          physicalLimitations: user.physical_limitations || "",
          socialPrivacy: user.social_privacy ?? true, // Use nullish coalescing to default to true only if null/undefined
          activitySharing: activitySharingValue,
        }));
        
        console.log('🔍 Set socialPrivacy to:', user.social_privacy ?? true);
        console.log('🔍 Set activitySharing to:', activitySharingValue);
        console.log('🔍 activity_sharing from DB:', user.activity_sharing);
        console.log('🔍 activity_sharing from localStorage:', localActivitySharing);
      }
    };

    fetchUserData();
  }, []);

  // Fetch friends when friends tab is selected
  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await friendService.getFriends();
      setFriends(data);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends list",
        variant: "destructive",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  // Fetch friends when friends tab is activated
  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends();
    }
  }, [activeTab]);

  // Fetch notifications when modal opens
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async () => {
    setShowNotifications(true);
    if (notifications.length === 0) {
      setLoadingNotifications(true);
      try {
        const fetchedNotifications = await notificationService.getNotifications();
        setNotifications(fetchedNotifications);
        
        // Mark unread notifications as read
        const unreadNotifications = fetchedNotifications.filter(n => !n.read);
        if (unreadNotifications.length > 0) {
          await Promise.all(
            unreadNotifications.map(n => notificationService.markAsRead(n.id))
          );
          // Update local state to reflect read status
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          await refreshUnreadCount(); // Refresh the global unread count
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setLoadingNotifications(false);
      }
    } else {
      // Mark any unread notifications as read when opening the modal
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        try {
          await Promise.all(
            unreadNotifications.map(n => notificationService.markAsRead(n.id))
          );
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          await refreshUnreadCount(); // Refresh the global unread count
        } catch (error) {
          console.error('Failed to mark notifications as read:', error);
        }
      }
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    try {
      // Find the notification to check its type
      const notification = notifications.find(n => n.id === notificationId);
      
      // If it's a friend request notification, reject the friend request
      if (notification?.type === 'friend_request' && notification.data?.friend_request_id) {
        try {
          await friendService.rejectFriendRequest(notification.data.friend_request_id);
        } catch (error) {
          console.error('Failed to reject friend request:', error);
          // Continue with notification removal even if reject fails
        }
      }
      
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount(); // Refresh the global unread count
      toast({
        title: "Notification removed",
        description: notification?.type === 'friend_request' 
          ? "Friend request declined" 
          : "Notification has been deleted",
      });
    } catch (error) {
      console.error('Error removing notification:', error);
      toast({
        title: "Error",
        description: "Failed to remove notification",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriendRequest = async (notificationId: string, friendRequestId: string) => {
    try {
      await friendService.acceptFriendRequest(friendRequestId);
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount(); // Refresh the global unread count
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    }
  };

  const handleRejectFriendRequest = async (notificationId: string, friendRequestId: string) => {
    try {
      await friendService.rejectFriendRequest(friendRequestId);
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount(); // Refresh the global unread count
      toast({
        title: "Friend Request Rejected",
        description: "Friend request has been declined",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    }
  };

  const handleBlockUser = async (notificationId: string, senderId: string) => {
    try {
      if (!senderId) {
        throw new Error('Unable to block user: No sender ID provided');
      }
      
      await friendService.blockUser(senderId);
      
      // Remove the notification
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await refreshUnreadCount();
      
      toast({
        title: "User Blocked",
        description: "The user has been blocked and can no longer send you friend requests.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to block user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      await friendService.unfriend(friendId);

      // This updates the UI by removing the unfriended user
      setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));

      toast({
        title: "Success",
        description: "Friend removed successfully",
      });
    } catch (error) {
      console.error('Failed to remove friend:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove friend",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return "👥";
      case "achievement":
        return "🏆";
      case "workout_reminder":
        return "💪";
      case "workout_invitation":
        return "📅";
      case "workout_challenge":
        return "⚡";
      case "social":
        return "❤️";
      default:
        return "📢";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  /**
   * Handles saving the updated profile information
   * Splits the full name into first and last name before saving
   */
  const handleSave = async () => {
    if (!userId) return;

    try {
      // Split full name into first and last name
      const [firstName, ...lastNameParts] = profileData.name.split(' ');
      const lastName = lastNameParts.join(' ');

      // Debug logging to see what we're trying to save
      console.log('💾 Saving profile data:');
      console.log('💾 socialPrivacy from state:', profileData.socialPrivacy);
      console.log('💾 socialPrivacy type:', typeof profileData.socialPrivacy);
      
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        fitness_level: profileData.fitnessLevel,
        primary_goals: profileData.primaryGoals,
        exercise_preferences: profileData.exercisePreferences,
        weekly_frequency: profileData.weeklyFrequency,
        session_duration: profileData.sessionDuration,
        equipment_access: profileData.equipmentAccess,
        physical_limitations: profileData.physicalLimitations,
        social_privacy: profileData.socialPrivacy,
        activity_sharing: profileData.activitySharing,
      };
      
      console.log('💾 Full update object:', updateData);

      // Prepare and send update to the server
      await authService.updateUserProfile(userId, updateData);

      // Show success notification
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      // Show error notification
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  /**
   * Generic input change handler
   * @param field 
   * @param value 
   */
  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'socialPrivacy') {
      console.log('🔄 Social privacy switch toggled to:', value);
      console.log('🔄 Value type:', typeof value);
      
      // Auto-save social privacy setting immediately when toggled
      handleSocialPrivacyChange(value as boolean);
    }
    if (field === 'activitySharing') {
      console.log('🔄 Activity sharing switch toggled to:', value);
      console.log('🔄 Value type:', typeof value);
      
      // Auto-save activity sharing setting immediately when toggled
      handleActivitySharingChange(value as boolean);
    }
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Handles immediate saving of social privacy setting when toggled
   */
  const handleSocialPrivacyChange = async (newValue: boolean) => {
    if (!userId) return;

    try {
      console.log('💾 Auto-saving social privacy to:', newValue);
      
      await authService.updateUserProfile(userId, {
        social_privacy: newValue,
      });

      toast({
        title: "Privacy Setting Updated",
        description: `Social features ${newValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('❌ Failed to update social privacy:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
      
      // Revert the switch state on error
      setProfileData(prev => ({ ...prev, socialPrivacy: !newValue }));
    }
  };

  /**
   * Handles immediate saving of activity sharing setting when toggled
   */
  const handleActivitySharingChange = async (newValue: boolean) => {
    if (!userId) return;

    try {
      console.log('💾 Auto-saving activity sharing to:', newValue);
      
      // Save to localStorage as backup (temporary until DB is migrated)
      localStorage.setItem(`activity_sharing_${userId}`, String(newValue));
      
      await authService.updateUserProfile(userId, {
        activity_sharing: newValue,
      });

      toast({
        title: "Activity Sharing Updated",
        description: `Activity sharing ${newValue ? 'enabled' : 'disabled'}`,
      });
      
      // Clear localStorage since DB save succeeded
      localStorage.removeItem(`activity_sharing_${userId}`);
    } catch (error) {
      console.error('❌ Failed to update activity sharing:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Check if it's a column not found error (database not migrated yet)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      
      console.log('❌ Error message:', errorMessage);
      console.log('❌ Error code:', errorCode);
      
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        toast({
          title: "Setting Saved Locally",
          description: "Activity sharing preference saved. Add database column to persist permanently.",
          variant: "default",
        });
        // Keep the new value in state and localStorage
        return;
      }
      
      // Show the actual error message for debugging
      toast({
        title: "Error Updating Activity Sharing",
        description: errorMessage || "Failed to update activity sharing setting. Check console for details.",
        variant: "destructive",
      });
      
      // Revert the switch state and localStorage on error
      localStorage.removeItem(`activity_sharing_${userId}`);
      setProfileData(prev => ({ ...prev, activitySharing: !newValue }));
    }
  };

  // Add this function to load blocked users
  const loadBlockedUsers = async () => {
    try {
      setLoadingBlockedUsers(true);
      const blocked = await friendService.getBlockedUsers();
      // Map the blocked users to the expected format
      const formattedBlocked = blocked.map(block => ({
        id: block.blocked_id,
        first_name: block.user.first_name,
        last_name: block.user.last_name,
        username: block.user.username,
        email: block.user.email,
        created_at: block.created_at
      }));
      setBlockedUsers(formattedBlocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast({
        title: "Error",
        description: "Failed to load blocked users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  // Function to handle unblocking a user
  const handleUnblockUser = async (userId: string) => {
    try {
      await friendService.unblockUser(userId);
      // Refresh the blocked users list
      await loadBlockedUsers();
      toast({
        title: "Success",
        description: "User has been unblocked.",
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error",
        description: "Failed to unblock user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle clicking on a friend to view their profile
  const handleFriendClick = (friendId: string) => {
    setSelectedFriendId(friendId);
  };

  // Handle going back from friend profile to main profile
  const handleBackFromFriendProfile = () => {
    setSelectedFriendId(null);
  };

  // If viewing a friend's profile, show FriendProfile component
  if (selectedFriendId) {
    return (
      <FriendProfile 
        friendId={selectedFriendId} 
        onBack={handleBackFromFriendProfile}
      />
    );
  }

  // Render the profile page
  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header with Notification Icon */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotificationClick}
                className="relative p-2"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
            </TabsList>

            {/* Profile Settings Tab */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Personal Information */}
                <WellnessCard className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Personal Information</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Profile Picture Section */}
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profileData.profilePicture} />
                        <AvatarFallback className="bg-gradient-primary text-white text-lg">
                          {profileData.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="zen" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>

                    {/* Basic Info Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          readOnly
                          className="bg-gray-50 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </WellnessCard>

                {/* Right Column - Privacy Settings */}
                <WellnessCard>
                  <h3 className="font-semibold mb-4">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Social Features</Label>
                        <p className="text-sm text-muted-foreground">Allow others to find and connect with you</p>
                      </div>
                      <Switch
                        checked={profileData.socialPrivacy}
                        onCheckedChange={(checked) => handleInputChange('socialPrivacy', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activity Sharing</Label>
                        <p className="text-sm text-muted-foreground">Share fitness goals and activity with friends</p>
                      </div>
                      <Switch
                        checked={profileData.activitySharing}
                        onCheckedChange={(checked) => handleInputChange('activitySharing', checked)}
                      />
                    </div>
                    
                    {/* Add the Manage Blocked Users button */}
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setShowBlockedUsers(true);
                        loadBlockedUsers();
                      }}
                    >
                      <UserMinus className="w-4 h-4" />
                      Manage Blocked Users
                    </Button>
                  </div>
                </WellnessCard>

                {/* Full Width Bottom Card - Fitness Preferences */}
                <WellnessCard className="lg:col-span-3">
                  <h2 className="text-xl font-semibold mb-6">Fitness Goal Specifications</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Fitness Level */}
                    <div>
                      <Label>Fitness Level</Label>
                      <Select value={profileData.fitnessLevel} onValueChange={(value) => handleInputChange('fitnessLevel', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Primary Goals */}
                    <div>
                      <Label>Primary Goals</Label>
                      <Select value={profileData.primaryGoals} onValueChange={(value) => handleInputChange('primaryGoals', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight-loss">Weight Loss</SelectItem>
                          <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                          <SelectItem value="endurance">Endurance</SelectItem>
                          <SelectItem value="flexibility">Flexibility</SelectItem>
                          <SelectItem value="general-health">General Health</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exercise Preferences */}
                    <div>
                      <Label>Exercise Preferences</Label>
                      <Select value={profileData.exercisePreferences} onValueChange={(value) => handleInputChange('exercisePreferences', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strength-training">Strength Training</SelectItem>
                          <SelectItem value="cardio">Cardio</SelectItem>
                          <SelectItem value="yoga">Yoga</SelectItem>
                          <SelectItem value="pilates">Pilates</SelectItem>
                          <SelectItem value="hiit">HIIT</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="outdoor">Outdoor Activities</SelectItem>
                          <SelectItem value="strength-cardio">Strength + Cardio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Weekly Frequency */}
                    <div>
                      <Label>Weekly Frequency</Label>
                      <Select value={profileData.weeklyFrequency} onValueChange={(value) => handleInputChange('weeklyFrequency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2-3-days">2-3 days</SelectItem>
                          <SelectItem value="4-5-days">4-5 days</SelectItem>
                          <SelectItem value="6-7-days">6-7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Session Duration */}
                    <div>
                      <Label>Session Duration</Label>
                      <Select value={profileData.sessionDuration} onValueChange={(value) => handleInputChange('sessionDuration', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15-30-min">15-30 min</SelectItem>
                          <SelectItem value="30-45-min">30-45 min</SelectItem>
                          <SelectItem value="45-60-min">45-60 min</SelectItem>
                          <SelectItem value="60-plus-min">60+ min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Equipment Access */}
                    <div>
                      <Label>Equipment Access</Label>
                      <Select value={profileData.equipmentAccess} onValueChange={(value) => handleInputChange('equipmentAccess', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home-bodyweight">Home (bodyweight)</SelectItem>
                          <SelectItem value="home-basic">Home (basic equipment)</SelectItem>
                          <SelectItem value="full-gym">Full gym</SelectItem>
                          <SelectItem value="outdoor">Outdoor spaces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Physical Limitations Textarea */}
                  <div className="mt-6">
                    <Label htmlFor="limitations">Physical Limitations</Label>
                    <Textarea
                      id="limitations"
                      placeholder="Please describe any physical limitations, injuries, or health conditions we should consider when planning your workouts..."
                      value={profileData.physicalLimitations}
                      onChange={(e) => handleInputChange('physicalLimitations', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end mt-6">
                    <Button variant="motivation" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </Button>
                  </div>
                </WellnessCard>
              </div>
            </TabsContent>

            {/* Friends Tab */}
            <TabsContent value="friends" className="space-y-4">
              <WellnessCard>
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">My Friends</h2>
                  <Badge variant="secondary" className="ml-2">
                    {friends.length}
                  </Badge>
                </div>

                {loadingFriends ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : friends.length > 0 ? (
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div 
                          className="flex items-center space-x-3 flex-1 cursor-pointer"
                          onClick={() => handleFriendClick(friend.id)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="" alt={friend.first_name} />
                            <AvatarFallback>
                              {friend.first_name?.[0]}{friend.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.first_name} {friend.last_name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnfriend(friend.id);
                          }}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Unfriend
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No friends yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setActiveTab("social")}
                    >
                      Find friends
                    </Button>
                  </div>
                )}
              </WellnessCard>
            </TabsContent>
          </Tabs>

          {/* Notifications Modal */}
          <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription>
                  Stay updated with your fitness journey and social connections
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2 text-muted-foreground">Loading notifications...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatTimestamp(notification.created_at)}
                            </p>
                            
                            {/* Friend Request Actions */}
                            {notification.type === 'friend_request' && notification.data?.friend_request_id && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleAcceptFriendRequest(notification.id, notification.data.friend_request_id)}
                                  className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectFriendRequest(notification.id, notification.data.friend_request_id)}
                                  className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                >
                                  <UserX className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleBlockUser(notification.id, notification.data?.sender_id)}
                                  className="h-7 px-3 text-xs text-destructive hover:text-destructive flex-1 sm:flex-none"
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  Block
                                </Button>
                              </div>
                            )}

                            {/* Workout Invitation Actions */}
                            {notification.type === 'workout_invitation' && (
                              <>
                                {/* Expandable Details Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedNotifications(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(notification.id)) {
                                        newSet.delete(notification.id);
                                      } else {
                                        newSet.add(notification.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="h-7 px-2 text-xs mt-2 w-full justify-between"
                                >
                                  <span>View Workout Details</span>
                                  {expandedNotifications.has(notification.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>

                                {/* Expanded Workout Details */}
                                {expandedNotifications.has(notification.id) && notification.data && (
                                  <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">Type:</span>
                                      <span className="capitalize">{notification.data.workout_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">When:</span>
                                      <span>{new Date(notification.data.workout_time).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">Duration:</span>
                                      <span>{notification.data.workout_duration} min</span>
                                    </div>
                                    {notification.data.workout_place && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                        <span className="font-medium">Place:</span>
                                        <span>{notification.data.workout_place}</span>
                                      </div>
                                    )}
                                    {notification.data.workout_note && (
                                      <div className="flex items-start gap-2">
                                        <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                                        <span className="font-medium">Note:</span>
                                        <span className="flex-1">{notification.data.workout_note}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="zen"
                                    onClick={async () => {
                                      // TODO: Implement accept invitation - add to calendar
                                      toast({
                                        title: "Coming Soon",
                                        description: "Calendar integration is not yet implemented.",
                                      });
                                      await handleRemoveNotification(notification.id);
                                    }}
                                    className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemoveNotification(notification.id)}
                                    className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              </>
                            )}

                            {/* Workout Challenge Actions */}
                            {notification.type === 'workout_challenge' && (
                              <>
                                {/* Expandable Details Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedNotifications(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(notification.id)) {
                                        newSet.delete(notification.id);
                                      } else {
                                        newSet.add(notification.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="h-7 px-2 text-xs mt-2 w-full justify-between"
                                >
                                  <span>View Challenge Details</span>
                                  {expandedNotifications.has(notification.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>

                                {/* Expanded Challenge Details */}
                                {expandedNotifications.has(notification.id) && notification.data && (
                                  <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">Type:</span>
                                      <span className="capitalize">{notification.data.workout_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">When:</span>
                                      <span>{new Date(notification.data.workout_time).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium">Duration:</span>
                                      <span>{notification.data.workout_duration} min</span>
                                    </div>
                                    {notification.data.workout_place && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                        <span className="font-medium">Place:</span>
                                        <span>{notification.data.workout_place}</span>
                                      </div>
                                    )}
                                    {notification.data.workout_note && (
                                      <div className="flex items-start gap-2">
                                        <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                                        <span className="font-medium">Challenge Note:</span>
                                        <span className="flex-1">{notification.data.workout_note}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="motivation"
                                    onClick={async () => {
                                      // TODO: Implement accept challenge - add to calendar
                                      toast({
                                        title: "Coming Soon",
                                        description: "Calendar integration is not yet implemented.",
                                      });
                                      await handleRemoveNotification(notification.id);
                                    }}
                                    className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemoveNotification(notification.id)}
                                    className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNotification(notification.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/10"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications</p>
                    <p className="text-sm">You're all caught up!</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Blocked Users Modal */}
          <Dialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Manage Blocked Users</DialogTitle>
                <DialogDescription>
                  View and manage users you've blocked. Unblocking a user will allow them to send you friend requests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {loadingBlockedUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserMinus className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>You haven't blocked any users yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {blockedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                            {user.username && (
                              <span className="text-muted-foreground ml-2">@{user.username}</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Blocked on: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowBlockedUsers(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </WellnessLayout>
  );
}