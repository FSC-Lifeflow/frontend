import { useState, useEffect } from "react";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Trophy, 
  Heart, 
  MessageCircle, 
  Share2, 
  UserPlus,
  Crown,
  Medal,
  Award,
  Users,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, type SearchUser } from "@/services/userService";
import { friendService } from "@/services/friendService";

// Mock data
const mockFriends = [
  { id: 1, name: "Alex Thompson", username: "@alexfit", avatar: "", streak: 12, weeklyPoints: 850 },
  { id: 2, name: "Maria Garcia", username: "@maria_wellness", avatar: "", streak: 8, weeklyPoints: 920 },
  { id: 3, name: "Jake Wilson", username: "@jake_strong", avatar: "", streak: 15, weeklyPoints: 780 },
  { id: 4, name: "Emma Davis", username: "@emma_yoga", avatar: "", streak: 6, weeklyPoints: 650 },
];

const mockPosts = [
  {
    id: 1,
    user: { name: "Alex Thompson", username: "@alexfit", avatar: "" },
    content: "Just completed a 5K run in 22 minutes! New personal record! 🏃‍♂️",
    timestamp: "2 hours ago",
    likes: 12,
    comments: 3
  },
  {
    id: 2,
    user: { name: "Maria Garcia", username: "@maria_wellness", avatar: "" },
    content: "Week 3 of my yoga journey complete! Feeling stronger and more flexible every day 🧘‍♀️",
    timestamp: "4 hours ago",
    likes: 18,
    comments: 5
  },
  {
    id: 3,
    user: { name: "John Doe", username: "@johndoe", avatar: "" },
    content: "Just finished a tough leg day at the gym! 💪",
    timestamp: "1 hour ago",
    likes: 5,
    comments: 2
  },
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

  const handleCreatePost = () => {
    if (newPost.trim()) {
      toast({
        title: "Post Shared",
        description: "Your update has been shared with your friends!",
      });
      setNewPost("");
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
              <h2 className="text-lg font-semibold mb-4">Share Your Progress</h2>
              <Textarea
                placeholder="Share an update about your wellness journey..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="mb-4"
              />
              <div className="flex justify-end">
                <Button variant="motivation" onClick={handleCreatePost}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Update
                </Button>
              </div>
            </WellnessCard>

            {/* Activity Feed */}
            <WellnessCard>
              <h2 className="text-lg font-semibold mb-4">Friend Activity</h2>
              <div className="space-y-4">
                {mockPosts.map((post) => (
                  <div key={post.id} className="border-b border-muted last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={post.user.avatar} />
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {post.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.user.name}</span>
                          <span className="text-sm text-muted-foreground">{post.user.username}</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{post.timestamp}</span>
                        </div>
                        <p className="text-foreground mb-3">{post.content}</p>
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
                            <Heart className="w-4 h-4 mr-1" />
                            {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.comments}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                        <p className="text-sm font-medium truncate">{friend.name}</p>
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
    </WellnessLayout>
  );
}