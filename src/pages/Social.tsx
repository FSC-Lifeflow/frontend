import { useState, useEffect } from "react";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Trophy, UserPlus, Crown, Medal, Award, Users,
  Loader2, Share2, Edit, Trash2, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, type SearchUser } from "@/services/userService";
import { friendService } from "@/services/friendService";
import { postService, type UserPost } from "@/services/postService";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Mock data
const mockFriends = [
  { id: 1, name: "Alex Thompson", username: "@alexfit", avatar: "", streak: 12, weeklyPoints: 850 },
  { id: 2, name: "Maria Garcia", username: "@maria_wellness", avatar: "", streak: 8, weeklyPoints: 920 },
  { id: 3, name: "Jake Wilson", username: "@jake_strong", avatar: "", streak: 15, weeklyPoints: 780 },
  { id: 4, name: "Emma Davis", username: "@emma_yoga", avatar: "", streak: 6, weeklyPoints: 650 },
];

export default function Social() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [newPost, setNewPost] = useState("");
  const [showPrivacyPrompt, setShowPrivacyPrompt] = useState(!localStorage.getItem('socialOptIn'));
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<SearchUser & { mutual_friends_count: number }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [isLoadingMyPosts, setIsLoadingMyPosts] = useState(false);
  const [editingPost, setEditingPost] = useState<UserPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const handleOptIn = () => {
    localStorage.setItem('socialOptIn', 'true');
    setShowPrivacyPrompt(false);
    toast({
      title: "Social Features Enabled",
      description: "You can now connect with friends and share your wellness journey!",
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await userService.searchUsers(searchQuery.trim());
      setSearchResults(results);
      setShowSearchResults(true);
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: `No users found matching "${searchQuery}"`,
        });
      } else {
        toast({
          title: "Search Results",
          description: `Found ${results.length} user${results.length === 1 ? '' : 's'} matching "${searchQuery}"`,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      console.log('🔵 Sending friend request to:', userId);
      await friendService.sendFriendRequest(userId);
      console.log('✅ Friend request sent successfully');
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully!",
      });
      // Remove the user from suggestions after sending request
      setSuggestions(prev => prev.filter(user => user.id !== userId));
    } catch (error: any) {
      console.error('❌ Error sending friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

  const handleAddFriendFromSearch = async (user: SearchUser) => {
    try {
      console.log('🔵 Sending friend request from search to:', user.first_name, user.last_name);
      await friendService.sendFriendRequest(user.id);
      console.log('✅ Friend request sent successfully from search');
      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${user.first_name} ${user.last_name}`,
      });
      // Remove the user from search results after sending request
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
    } catch (error: any) {
      console.error('❌ Error sending friend request from search:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast({
        title: "Empty Post",
        description: "Please write something before sharing!",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPost(true);
    try {
      const createdPost = await postService.createPost(newPost);
      toast({
        title: "Post Shared",
        description: "Your workout update has been shared with your friends!",
      });
      setNewPost("");
      // Add the new post to the beginning of the posts array
      setPosts(prev => [createdPost, ...prev]);
    } catch (error: any) {
      console.error('❌ Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share your post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleOpenMyPosts = async () => {
    setShowMyPosts(true);
    setIsLoadingMyPosts(true);
    try {
      const userPosts = await postService.getMyPosts(50);
      setMyPosts(userPosts);
    } catch (error: any) {
      console.error('❌ Error loading my posts:', error);
      toast({
        title: "Error",
        description: "Failed to load your posts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMyPosts(false);
    }
  };

  const handleEditPost = (post: UserPost) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editContent.trim()) return;

    setIsSavingEdit(true);
    try {
      const updatedPost = await postService.updatePost(editingPost.id, editContent);
      toast({
        title: "Post Updated",
        description: "Your post has been updated successfully!",
      });
      // Update in myPosts list
      setMyPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
      // Update in friend activity feed if present
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
      setEditingPost(null);
      setEditContent("");
    } catch (error: any) {
      console.error('❌ Error updating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setDeletingPostId(postId);
    try {
      await postService.deletePost(postId);
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully!",
      });
      // Remove from myPosts list
      setMyPosts(prev => prev.filter(p => p.id !== postId));
      // Remove from friend activity feed if present
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error: any) {
      console.error('❌ Error deleting post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  // Handle search on Enter key press
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Load suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const data = await friendService.getFriendSuggestions(4);
        setSuggestions(data);
      } catch (error) {
        console.error('Failed to load suggestions: ', error);
        toast({
          title: "Error",
          description: "Failed to load friend suggestions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Only load if user is authenticated and has opted into social features
    if (!showPrivacyPrompt) {
      loadSuggestions();
    }
  }, [showPrivacyPrompt, toast]);

  // Clear search results when search query is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const friendPosts = await postService.getFriendPosts(20);
        setPosts(friendPosts);
      } catch (error) {
        console.error('Failed to load posts: ', error);
        toast({
          title: "Error",
          description: "Failed to load friend activity",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPosts(false);
      }
    };

    // Only load if user is authenticated and has opted into social features
    if (!showPrivacyPrompt) {
      loadPosts();
    }
  }, [showPrivacyPrompt, toast]);

  if (showPrivacyPrompt) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <WellnessCard className="text-center">
              <div className="w-16 h-16 bg-gradient-motivation rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Join the Wellness Community</h1>
              <p className="text-muted-foreground mb-6">
                Connect with friends, share your progress, and stay motivated together! 
                Your privacy is important - you control what you share and with whom.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="motivation" onClick={handleOptIn}>
                  Enable Social Features
                </Button>
                <Button variant="zen" onClick={() => setShowPrivacyPrompt(false)}>
                  Maybe Later
                </Button>
              </div>
            </WellnessCard>
          </div>
        </div>
      </WellnessLayout>
    );
  }

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Social Hub</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <WellnessCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Share Your Progress</h2>
                <Button variant="outline" size="sm" onClick={handleOpenMyPosts}>
                  <FileText className="w-4 h-4 mr-2" />
                  My Posts
                </Button>
              </div>
              <Textarea
                placeholder="Share an update about your wellness journey..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="mb-4"
              />
              <div className="flex justify-end">
                <Button variant="motivation" onClick={handleCreatePost} disabled={isCreatingPost}>
                  {isCreatingPost ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  {isCreatingPost ? "Sharing..." : "Share Update"}
                </Button>
              </div>
            </WellnessCard>

            {/* Activity Feed */}
            <WellnessCard>
              <h2 className="text-lg font-semibold mb-4">Friend Activity</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {isLoadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="border-b border-muted last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-primary text-white">
                            {post.user?.first_name?.[0]}{post.user?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {post.user?.first_name} {post.user?.last_name}
                            </span>
                            {post.user?.username && (
                              <span className="text-sm text-muted-foreground">
                                @{post.user.username}
                              </span>
                            )}
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                            {post.updated_at && post.updated_at !== post.created_at && (
                              <>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground italic">
                                  edited {new Date(post.updated_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </>
                            )}
                            {post.is_edited && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground mb-2">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No activity from friends yet. Add friends to see their workout updates!
                  </p>
                )}
              </div>
            </WellnessCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Friend Search */}
            <WellnessCard>
              <h3 className="font-semibold mb-4">Find Friends</h3>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
                <Button 
                  variant="zen" 
                  size="sm" 
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Search Results */}
              {showSearchResults && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Search Results ({searchResults.length})
                  </h4>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-primary text-white">
                              {user.first_name[0]}{user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                          </div>
                          <Button 
                            variant="zen" 
                            size="sm"
                            onClick={() => handleAddFriendFromSearch(user)}
                          >
                            <UserPlus className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found matching your search
                    </p>
                  )}
                </div>
              )}
            </WellnessCard>

            {/* Leaderboard */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Weekly Leaderboard</h3>
              </div>
              <div className="space-y-3">
                {mockFriends
                  .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
                  .map((friend, index) => (
                    <div key={friend.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-center w-8 h-8">
                        {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                        {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                        {index === 2 && <Award className="w-5 h-5 text-amber-600" />}
                        {index > 2 && <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>}
                      </div>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="bg-gradient-primary text-white text-xs">
                          {friend.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">{friend.weeklyPoints} pts</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {friend.streak}🔥
                      </Badge>
                    </div>
                  ))}
              </div>
            </WellnessCard>

            {/* Friend Suggestions */}
            <WellnessCard>
              <h3 className="font-semibold mb-4">People You May Know</h3>
              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2">
                  {suggestions.map((user) => (
                    <div key={user.id} className="flex flex-col items-center p-3 hover:bg-muted/50 rounded-lg transition-colors space-y-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback>
                          {user.first_name?.[0]}{user.last_name?.[0] || user.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.mutual_friends_count} mutual friend{user.mutual_friends_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAddFriend(user.id)}
                        className="w-full"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No suggestions available right now.
                </p>
              )}
            </WellnessCard>
          </div>
        </div>
      </div>

      {/* My Posts Dialog */}
      <Dialog open={showMyPosts} onOpenChange={setShowMyPosts}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Posts</DialogTitle>
            <DialogDescription>
              View, edit, or delete your workout progress posts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingMyPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myPosts.length > 0 ? (
              myPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 space-y-3">
                  {editingPost?.id === post.id ? (
                    <>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingPost(null);
                            setEditContent("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="motivation" 
                          size="sm" 
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit}
                        >
                          {isSavingEdit ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                            {post.is_edited && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground">{post.content}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditPost(post)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                You haven't created any posts yet. Share your first workout update!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </WellnessLayout>
  );
}