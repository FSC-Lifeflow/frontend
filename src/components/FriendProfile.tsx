import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Loader2, UserPlus, Ban, Activity, Clock, X } from "lucide-react";
import { userService } from "@/services/userService";
import { friendService, type SearchUser } from "@/services/friendService";
import { postService, type UserPost } from "@/services/postService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Type for friend's public profile data
 */
export type FriendProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  fitness_level?: string;
  primary_goals?: string;
  exercise_preferences?: string;
  activity_sharing?: boolean;
  created_at: string;
};

/**
 * Props for FriendProfile component
 */
type FriendProfileProps = {
  friendId: string;
  onBack: () => void;
};

/**
 * FriendProfile Component
 * Displays a friend's public profile information including:
 * - Name and profile picture
 * - Number of friends
 * - Friends list
 * - Fitness level
 * - Primary goals
 * - Exercise preferences
 */
export default function FriendProfile({ friendId, onBack }: FriendProfileProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<FriendProfileData | null>(null);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [allPosts, setAllPosts] = useState<UserPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const postsEndRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const postsPerPage = 10;

  // Fetch all posts for the modal
  const fetchAllPosts = async () => {
    try {
      setIsLoadingPosts(true);
      const allUserPosts = await postService.getUserPosts(profileData?.id || '', 50); // Get up to 50 posts
      setAllPosts(allUserPosts);
    } catch (error) {
      console.error('Failed to fetch all posts:', error);
      toast({
        title: "Error",
        description: "Failed to load all posts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Open modal and load all posts
  const handleOpenAllPosts = () => {
    setShowAllPosts(true);
    fetchAllPosts();
  };

  // Fetch friend's activity posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!friendId || !profileData?.activity_sharing) return;
      
      setIsLoadingPosts(true);
      try {
        const userPosts = await postService.getUserPosts(friendId, 5); // Get last 5 posts
        setPosts(userPosts);
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
        toast({
          title: "Error",
          description: "Failed to load activity posts",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [friendId, profileData?.activity_sharing, toast]);

  // Format post timestamp
  const formatPostTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  // Render a single post item
  const renderPost = (post: UserPost) => (
    <div key={post.id} className="p-4 border rounded-lg mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt={post.user?.first_name} />
            <AvatarFallback className="text-xs">
              {post.user?.first_name?.[0]}{post.user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {post.user?.first_name} {post.user?.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 mr-1" />
          <span>{formatPostTime(post.created_at)}</span>
          {post.is_edited && (
            <span className="ml-2 text-xs text-muted-foreground/70">(edited)</span>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground whitespace-pre-line">{post.content}</p>
    </div>
  );

  // Filter posts based on search query
  const filteredPosts = allPosts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const paginatedPosts = filteredPosts.slice(0, page * postsPerPage);
  const hasMore = paginatedPosts.length < filteredPosts.length;

  // Fetch friend's profile data and check relationship status
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('Not authenticated');
        }

        // Check if blocked
        const { data: blocks } = await supabase
          .from('user_blocks')
          .select('*')
          .or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${friendId}),and(blocker_id.eq.${friendId},blocked_id.eq.${currentUser.id})`);

        if (blocks && blocks.length > 0) {
          const block = blocks[0];
          if (block.blocker_id === currentUser.id) {
            setIsBlocked(true);
          } else {
            setBlockedBy(true);
          }
          setLoading(false);
          return;
        }

        // Check friendship status
        const { data: friendshipData } = await supabase
          .from('friend_requests')
          .select('status')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`)
          .eq('status', 'accepted')
          .single();

        setIsFriend(!!friendshipData);

        const data = await userService.getFriendProfile(friendId);
        console.log('👤 Loaded friend profile:', {
          name: `${data?.first_name} ${data?.last_name}`,
          activity_sharing: data?.activity_sharing,
          has_fitness_data: !!(data?.fitness_level || data?.primary_goals || data?.exercise_preferences)
        });
        setProfileData(data);
      } catch (error) {
        console.error('Failed to fetch friend profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [friendId, toast]);

  // Fetch friend's friends list
  useEffect(() => {
    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const data = await friendService.getFriendsOfUser(friendId);
        setFriends(data);
      } catch (error) {
        console.error('Failed to fetch friend\'s friends:', error);
        toast({
          title: "Error",
          description: "Failed to load friends list",
          variant: "destructive",
        });
      } finally {
        setLoadingFriends(false);
      }
    };

    if (friendId) {
      fetchFriends();
    }
  }, [friendId, toast]);

  // Helper function to format fitness level
  const formatFitnessLevel = (level?: string) => {
    if (!level) return "Not specified";
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  // Helper function to format goals
  const formatGoal = (goal?: string) => {
    if (!goal) return "Not specified";
    return goal.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Helper function to format exercise preferences
  const formatExercisePreference = (pref?: string) => {
    if (!pref) return "Not specified";
    return pref.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </WellnessLayout>
    );
  }

  // Handle sending friend request
  const handleSendFriendRequest = async () => {
    setSendingRequest(true);
    try {
      await friendService.sendFriendRequest(friendId);
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent!",
      });
      // Optionally go back after sending
      setTimeout(() => onBack(), 1500);
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  // Show blocked message
  if (blockedBy) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <WellnessCard>
              <div className="text-center py-12">
                <Ban className="w-16 h-16 mx-auto mb-4 text-destructive" />
                <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground">
                  This user has restricted access to their profile.
                </p>
              </div>
            </WellnessCard>
          </div>
        </div>
      </WellnessLayout>
    );
  }

  if (isBlocked) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <WellnessCard>
              <div className="text-center py-12">
                <Ban className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">User Blocked</h2>
                <p className="text-muted-foreground">
                  You have blocked this user.
                </p>
              </div>
            </WellnessCard>
          </div>
        </div>
      </WellnessLayout>
    );
  }

  if (!profileData) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <WellnessCard>
              <p className="text-center text-muted-foreground py-8">
                Profile not found
              </p>
            </WellnessCard>
          </div>
        </div>
      </WellnessLayout>
    );
  }

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {!isFriend && (
              <Button 
                variant="default" 
                onClick={handleSendFriendRequest}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Send Friend Request
              </Button>
            )}
          </div>

          {/* Profile Header */}
          <WellnessCard className="mb-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src="" alt={profileData.first_name} />
                <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                  {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {profileData.first_name} {profileData.last_name}
                </h1>
                <p className="text-muted-foreground">@{profileData.username}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                  </span>
                </div>
              </div>
            </div>
          </WellnessCard>

          {/* Fitness Information */}
          <WellnessCard className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Fitness Profile</h2>
            {(() => {
              const isPrivate = (profileData.activity_sharing ?? true) === false;
              console.log('🔒 Privacy check:', {
                activity_sharing: profileData.activity_sharing,
                isPrivate,
                showing: isPrivate ? 'privacy message' : 'fitness data'
              });
              return isPrivate;
            })() ? (
              <div className="text-center py-8">
                <div className="bg-muted/50 rounded-lg p-6 border-2 border-dashed border-muted-foreground/20">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">Activity Sharing Disabled</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    This user has chosen not to share their fitness information
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Fitness Level</h3>
                  <Badge variant="secondary" className="text-base">
                    {formatFitnessLevel(profileData.fitness_level)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Primary Goals</h3>
                  <Badge variant="secondary" className="text-base">
                    {formatGoal(profileData.primary_goals)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Exercise Preferences</h3>
                  <Badge variant="secondary" className="text-base">
                    {formatExercisePreference(profileData.exercise_preferences)}
                  </Badge>
                </div>
              </div>
            )}
          </WellnessCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Friends List - Narrower column */}
            <div className="lg:col-span-1">
              <WellnessCard>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Friends</h2>
                  <Badge variant="secondary" className="ml-1">
                    {friends.length}
                  </Badge>
                </div>

                {loadingFriends ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : friends.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="" alt={friend.first_name} />
                          <AvatarFallback className="text-sm">
                            {friend.first_name?.[0]}{friend.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-2 overflow-hidden">
                          <p className="font-medium text-sm truncate">{friend.first_name} {friend.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No friends to display</p>
                  </div>
                )}
              </WellnessCard>
            </div>

            {/* Activity Posts - Wider column */}
            <div className="lg:col-span-2">
              <WellnessCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                  </div>
                  {posts.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary"
                      onClick={handleOpenAllPosts}
                    >
                      View All
                    </Button>
                  )}
                </div>

                {!profileData?.activity_sharing ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="bg-muted/50 rounded-lg p-6 border-2 border-dashed border-muted-foreground/20">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">Activity Sharing Disabled</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        This user has chosen not to share their activity
                      </p>
                    </div>
                  </div>
                ) : isLoadingPosts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {posts.map(renderPost)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity to display</p>
                  </div>
                )}
              </WellnessCard>

              {/* All Posts Modal */}
              <Dialog open={showAllPosts} onOpenChange={setShowAllPosts}>
                <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col overflow-hidden">
                  {/* Fixed Header */}
                  <div className="border-b p-4">
                    <DialogHeader>
                      <DialogTitle>All Activity Posts</DialogTitle>
                    </DialogHeader>
                    
                    <div className="mt-4">
                      <Input
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {isLoadingPosts ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : filteredPosts.length > 0 ? (
                        <>
                          {paginatedPosts.map(renderPost)}
                          {hasMore && (
                            <div className="flex justify-center mt-4">
                              <Button 
                                variant="outline" 
                                onClick={() => setPage(p => p + 1)}
                                disabled={isLoadingMore}
                                className="w-full max-w-xs"
                              >
                                {isLoadingMore ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Load More
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No posts found</p>
                          {searchQuery && (
                            <p className="text-sm mt-1">No posts match your search</p>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </WellnessLayout>
  );
}
