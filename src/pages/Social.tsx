import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import FriendProfile from "@/components/FriendProfile";
import { MentionText } from "@/components/MentionText";
import { MentionTextarea } from "@/components/MentionTextarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Loader2,
  Image as ImageIcon,
  X,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Zap,
  Send,
  Check,
  Sparkles,
  ThumbsUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, type SearchUser } from "@/services/userService";
import { friendService } from "@/services/friendService";
import { postService, type Post, type UserPost } from "@/services/postService";
import { notificationService } from "@/services/notificationService";
import { postInteractionService, type PostComment } from "@/services/postInteractionService";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Mock data
const mockFriends = [
  { id: 1, name: "Alex Thompson", username: "@alexfit", avatar: "", weeklyPoints: 850 },
  { id: 2, name: "Maria Garcia", username: "@maria_wellness", avatar: "", weeklyPoints: 920 },
  { id: 3, name: "Jake Wilson", username: "@jake_strong", avatar: "", weeklyPoints: 780 },
  { id: 4, name: "Emma Davis", username: "@emma_yoga", avatar: "", weeklyPoints: 650 },
];

export default function Social() {
  const { toast } = useToast();
  const location = useLocation();
  const highlightedPostRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPost, setNewPost] = useState("");
  const [showPrivacyPrompt, setShowPrivacyPrompt] = useState(true);
  const [isCheckingSocialPrivacy, setIsCheckingSocialPrivacy] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<SearchUser & { mutual_friends_count: number }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [isLoadingMyPosts, setIsLoadingMyPosts] = useState(false);
  const [editingPost, setEditingPost] = useState<UserPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  
  // Comments and likes states
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [postLikes, setPostLikes] = useState<Array<{ user_id: string; user?: SearchUser }>>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [showSinglePostModal, setShowSinglePostModal] = useState(false);
  const [singlePost, setSinglePost] = useState<UserPost | null>(null);
  const [isLoadingSinglePost, setIsLoadingSinglePost] = useState(false);
  
  // Co-Workout states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<SearchUser[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  
  // Multi-step modal states
  const [inviteStep, setInviteStep] = useState(1);
  const [challengeStep, setChallengeStep] = useState(1);
  
  // Workout details states
  const [workoutType, setWorkoutType] = useState("");
  const [workoutTime, setWorkoutTime] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutPlace, setWorkoutPlace] = useState("");
  const [workoutNote, setWorkoutNote] = useState("");
  
  // Friend profile viewing
  const [viewingFriendId, setViewingFriendId] = useState<string | null>(null);

  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [selectedMotivationFriends, setSelectedMotivationFriends] = useState<SearchUser[]>([]);
  const [motivationMessage, setMotivationMessage] = useState("");
  const [isSendingMotivation, setIsSendingMotivation] = useState(false);
  const [isRequestingMotivation, setIsRequestingMotivation] = useState(false);

  const handleOptIn = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Update database social_privacy field
      const { error } = await supabase
        .from('users')
        .update({ social_privacy: true })
        .eq('id', currentUser.id);

      if (error) {
        console.error('❌ Failed to update social_privacy:', error);
        throw error;
      }

      // Update localStorage as backup
      localStorage.setItem('socialOptIn', 'true');
      setShowPrivacyPrompt(false);
      
      toast({
        title: "Social Features Enabled",
        description: "You can now connect with friends and share your wellness journey!",
      });
    } catch (error: any) {
      console.error('❌ Error enabling social features:', error);
      toast({
        title: "Error",
        description: "Failed to enable social features. Please try again.",
        variant: "destructive",
      });
    }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) {
      toast({
        title: "Empty Post",
        description: "Please add some text or an image",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPost(true);
    try {
      const createdPost = await postService.createPost(newPost.trim(), selectedImage || undefined);
      
      toast({
        title: "Post Shared",
        description: "Your workout update has been shared with your friends!",
      });
      
      // Add new post to the beginning of the feed
      setPosts([createdPost, ...posts]);
      
      // Clear form
      setNewPost("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error('❌ Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const fetchedPosts = await postService.getFeedPosts();
      setPosts(fetchedPosts);
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      // Silently fail - user will see mock data
    } finally {
      setIsLoadingPosts(false);
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

  // Handle like/unlike post
  const handleToggleLike = async (post: UserPost) => {
    try {
      if (post.is_liked_by_user) {
        await postInteractionService.unlikePost(post.id);
        // Update post in state
        const updatePost = (p: UserPost) => 
          p.id === post.id 
            ? { ...p, is_liked_by_user: false, likes_count: (p.likes_count || 1) - 1 }
            : p;
        setPosts(prev => prev.map(updatePost));
        setMyPosts(prev => prev.map(updatePost));
      } else {
        await postInteractionService.likePost(post.id);
        // Update post in state
        const updatePost = (p: UserPost) => 
          p.id === post.id 
            ? { ...p, is_liked_by_user: true, likes_count: (p.likes_count || 0) + 1 }
            : p;
        setPosts(prev => prev.map(updatePost));
        setMyPosts(prev => prev.map(updatePost));
      }
    } catch (error: any) {
      console.error('❌ Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  // Open comments modal
  const handleOpenComments = async (post: UserPost) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    setIsLoadingComments(true);
    try {
      const postComments = await postInteractionService.getPostComments(post.id);
      setComments(postComments);
    } catch (error: any) {
      console.error('❌ Error loading comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Post a comment
  const handlePostComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const comment = await postInteractionService.createComment(selectedPost.id, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment("");
      
      // Update comments count in posts
      const updatePost = (p: UserPost) => 
        p.id === selectedPost.id 
          ? { ...p, comments_count: (p.comments_count || 0) + 1 }
          : p;
      setPosts(prev => prev.map(updatePost));
      setMyPosts(prev => prev.map(updatePost));
      
      toast({
        title: "Comment Posted",
        description: "Your comment has been added!",
      });
    } catch (error: any) {
      console.error('❌ Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  // Toggle comment like
  const handleToggleCommentLike = async (comment: PostComment) => {
    try {
      if (comment.is_liked_by_user) {
        await postInteractionService.unlikeComment(comment.id);
        setComments(prev => prev.map(c => 
          c.id === comment.id 
            ? { ...c, is_liked_by_user: false, likes_count: (c.likes_count || 1) - 1 }
            : c
        ));
      } else {
        await postInteractionService.likeComment(comment.id);
        setComments(prev => prev.map(c => 
          c.id === comment.id 
            ? { ...c, is_liked_by_user: true, likes_count: (c.likes_count || 0) + 1 }
            : c
        ));
      }
    } catch (error: any) {
      console.error('❌ Error toggling comment like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  // Load replies for a comment
  const handleLoadReplies = async (commentId: string) => {
    if (expandedCommentId === commentId) {
      setExpandedCommentId(null);
      return;
    }

    setExpandedCommentId(commentId);
    try {
      const replies = await postInteractionService.getCommentReplies(commentId);
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, replies } : c
      ));
    } catch (error: any) {
      console.error('❌ Error loading replies:', error);
      toast({
        title: "Error",
        description: "Failed to load replies",
        variant: "destructive",
      });
    }
  };

  // Post a reply
  const handlePostReply = async (comment: PostComment) => {
    if (!replyContent.trim()) return;

    // Check if the comment owner is blocked
    if (comment.user_id) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          // Check if either user has blocked the other
          const { data: blocks } = await supabase
            .from('user_blocks')
            .select('*')
            .or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${comment.user_id}),and(blocker_id.eq.${comment.user_id},blocked_id.eq.${currentUser.id})`);

          if (blocks && blocks.length > 0) {
            toast({
              title: "Cannot Reply",
              description: "You cannot reply to this comment",
              variant: "destructive",
            });
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error checking block status:', error);
      }
    }

    setIsPostingReply(true);
    try {
      const reply = await postInteractionService.createReply(comment.id, replyContent);
      setComments(prev => prev.map(c => 
        c.id === comment.id 
          ? { 
              ...c, 
              replies: [...(c.replies || []), reply],
              replies_count: (c.replies_count || 0) + 1
            }
          : c
      ));
      setReplyContent("");
      toast({
        title: "Reply Posted",
        description: "Your reply has been added!",
      });
    } catch (error: any) {
      console.error('❌ Error posting reply:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setIsPostingReply(false);
    }
  };

  // View who liked a post
  const handleViewLikes = async (post: UserPost) => {
    setSelectedPost(post);
    setShowLikesModal(true);
    setIsLoadingLikes(true);
    
    try {
      // Get all likes for this post
      const { data: likes, error } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id);

      if (error) {
        console.error('❌ Error fetching likes:', error);
        toast({
          title: "Error",
          description: "Failed to load likes",
          variant: "destructive",
        });
        return;
      }

      if (!likes || likes.length === 0) {
        setPostLikes([]);
        return;
      }

      // Get user info for all likers
      const userIds = likes.map(l => l.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, created_at')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Error fetching user info:', usersError);
      }

      const likesWithUsers = likes.map(like => ({
        user_id: like.user_id,
        user: users?.find(u => u.id === like.user_id)
      }));

      setPostLikes(likesWithUsers);
    } catch (error) {
      console.error('❌ Error in handleViewLikes:', error);
      toast({
        title: "Error",
        description: "Failed to load likes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLikes(false);
    }
  };

  // Fetch a single post by ID
  const fetchSinglePost = async (postId: string) => {
    setIsLoadingSinglePost(true);
    setShowSinglePostModal(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the post
      const { data: post, error: postError } = await supabase
        .from('user_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('❌ Failed to get post:', postError);
        throw new Error('Failed to get post');
      }

      // Get user info for the post
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .eq('id', post.user_id)
        .single();

      // Get likes data
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .eq('post_id', postId);

      // Get comments with their IDs
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .eq('post_id', postId);

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: repliesData } = commentIds.length > 0 
        ? await supabase
            .from('comment_replies')
            .select('comment_id')
            .in('comment_id', commentIds)
        : { data: [] };

      // Build likes count and check if user liked
      const likesCount = likesData?.length || 0;
      const isLikedByUser = likesData?.some(like => like.user_id === currentUser.id) || false;

      // Build comments count (including replies)
      let commentsCount = commentsData?.length || 0;
      commentsCount += repliesData?.length || 0;

      const postWithData: UserPost = {
        ...post,
        user: userInfo || undefined,
        likes_count: likesCount,
        comments_count: commentsCount,
        is_liked_by_user: isLikedByUser
      };

      setSinglePost(postWithData);
    } catch (error: any) {
      console.error('❌ Error fetching single post:', error);
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
      setShowSinglePostModal(false);
    } finally {
      setIsLoadingSinglePost(false);
    }
  };

  // Handle search on Enter key press
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle sending motivation
  const handleSendMotivation = async () => {
    if (selectedMotivationFriends.length === 0) {
      toast({
        title: "No Friends Selected",
        description: "Please select at least one friend to motivate.",
        variant: "destructive",
      });
      return;
    }

    if (!motivationMessage.trim()) {
      toast({
        title: "Empty Message",
        description: "Please write a motivational message.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingMotivation(true);
    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get current user's profile info
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      // Create notifications for all selected friends
      const notificationPromises = selectedMotivationFriends.map(friend =>
        notificationService.createNotification({
          user_id: friend.id,
          type: 'motivation_received',
          title: 'You received motivation!',
          message: `${userProfile?.first_name || 'Someone'} ${userProfile?.last_name || ''} sent you motivation!`,
          data: {
            sender_id: currentUser.id,
            sender_name: `${userProfile?.first_name} ${userProfile?.last_name}`,
            sender_username: userProfile?.username,
            motivation_message: motivationMessage
          },
          read: false
        }).catch(err => {
          console.warn(`⚠️ Could not create notification for ${friend.first_name}:`, err);
          return null;
        })
      );
      
      await Promise.all(notificationPromises);

      const friendNames = selectedMotivationFriends.length === 1
        ? `${selectedMotivationFriends[0].first_name} ${selectedMotivationFriends[0].last_name}`
        : `${selectedMotivationFriends.length} friends`;
      
      toast({
        title: "Motivation Sent!",
        description: `Your motivational message was sent to ${friendNames}.`,
      });
      
      // Reset modal state
      setShowMotivationModal(false);
      setSelectedMotivationFriends([]);
      setMotivationMessage("");
    } catch (error: any) {
      console.error('❌ Error sending motivation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send motivation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMotivation(false);
    }
  };

  // Handle requesting motivation from all friends
  const handleRequestMotivation = async () => {
    setIsRequestingMotivation(true);
    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get current user's profile info
      const { data: userProfile } = await supabase
        .from('users')
        .select('first_name, last_name, username')
        .eq('id', currentUser.id)
        .single();

      // Get all friends
      const friendsList = await friendService.getFriends();
      
      if (friendsList.length === 0) {
        toast({
          title: "No Friends",
          description: "You don't have any friends to request motivation from yet.",
          variant: "destructive",
        });
        return;
      }

      // Create notifications for all friends
      const notificationPromises = friendsList.map(friend =>
        notificationService.createNotification({
          user_id: friend.id,
          type: 'motivation_request',
          title: 'Motivation Request',
          message: `${userProfile?.first_name || 'Someone'} ${userProfile?.last_name || ''} is requesting motivation!`,
          data: {
            requester_id: currentUser.id,
            requester_name: `${userProfile?.first_name} ${userProfile?.last_name}`,
            requester_username: userProfile?.username
          },
          read: false
        }).catch(err => {
          console.warn(`⚠️ Could not create notification for ${friend.first_name}:`, err);
          return null;
        })
      );
      
      await Promise.all(notificationPromises);

      toast({
        title: "Request Sent!",
        description: `Motivation request sent to ${friendsList.length} friend${friendsList.length === 1 ? '' : 's'}.`,
      });
    } catch (error: any) {
      console.error('❌ Error requesting motivation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request motivation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingMotivation(false);
    }
  };

  // Check social privacy setting on mount
  useEffect(() => {
    const checkSocialPrivacy = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          setIsCheckingSocialPrivacy(false);
          return;
        }

        // Check database for social_privacy setting
        const { data: userData, error } = await supabase
          .from('users')
          .select('social_privacy')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('❌ Error checking social_privacy:', error);
          // If there's an error, check localStorage as fallback
          const hasOptedIn = localStorage.getItem('socialOptIn') === 'true';
          setShowPrivacyPrompt(!hasOptedIn);
        } else {
          // If social_privacy is true or null (defaults to true), don't show prompt
          const socialPrivacy = userData?.social_privacy ?? null;
          const hasOptedIn = socialPrivacy === true || socialPrivacy === null;
          setShowPrivacyPrompt(!hasOptedIn);
          
          // Sync localStorage with database
          if (hasOptedIn) {
            localStorage.setItem('socialOptIn', 'true');
          }
        }
      } catch (error) {
        console.error('❌ Error in checkSocialPrivacy:', error);
        // Fallback to localStorage
        const hasOptedIn = localStorage.getItem('socialOptIn') === 'true';
        setShowPrivacyPrompt(!hasOptedIn);
      } finally {
        setIsCheckingSocialPrivacy(false);
      }
    };

    checkSocialPrivacy();
  }, []);

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
    if (!showPrivacyPrompt && !isCheckingSocialPrivacy) {
      loadSuggestions();
    }
  }, [showPrivacyPrompt, isCheckingSocialPrivacy, toast]);

  // Clear search results when search query is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // Load posts on component mount
  useEffect(() => {
    if (!showPrivacyPrompt && !isCheckingSocialPrivacy) {
      loadPosts();
    }
  }, [showPrivacyPrompt, isCheckingSocialPrivacy]);

  // Handle navigation from notifications
  useEffect(() => {
    const state = location.state as { 
      openMyPosts?: boolean; 
      highlightPostId?: string;
      viewSinglePost?: boolean;
      postId?: string;
      viewFriendId?: string;
    } | null;
    
    if (state?.viewFriendId) {
      // View friend profile from mention click
      setViewingFriendId(state.viewFriendId);
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    } else if (state?.viewSinglePost && state.postId) {
      // Fetch and display single post
      fetchSinglePost(state.postId);
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    } else if (state?.openMyPosts) {
      // Open My Posts modal
      handleOpenMyPosts();
      
      // Scroll to highlighted post after a short delay to ensure modal is rendered
      if (state.highlightPostId) {
        setTimeout(() => {
          highlightedPostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load friends for co-workout functionality
  useEffect(() => {
    const loadFriends = async () => {
      if (!showPrivacyPrompt && !isCheckingSocialPrivacy) {
        setIsLoadingFriends(true);
        try {
          const friendsList = await friendService.getFriends();
          setFriends(friendsList);
        } catch (error) {
          console.error('Failed to load friends:', error);
        } finally {
          setIsLoadingFriends(false);
        }
      }
    };
    loadFriends();
  }, [showPrivacyPrompt, isCheckingSocialPrivacy]);

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
    if (!showPrivacyPrompt && !isCheckingSocialPrivacy) {
      loadPosts();
    }
  }, [showPrivacyPrompt, isCheckingSocialPrivacy, toast]);

  // If viewing a friend's profile, show FriendProfile component
  if (viewingFriendId) {
    return <FriendProfile friendId={viewingFriendId} onBack={() => setViewingFriendId(null)} />;
  }

  // Show loading state while checking social privacy
  if (isCheckingSocialPrivacy) {
    return (
      <WellnessLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </WellnessLayout>
    );
  }

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
              <MentionTextarea
                placeholder="Share an update about your wellness journey... (Type @ to mention friends)"
                value={newPost}
                onChange={setNewPost}
                className="mb-4"
                rows={3}
              />
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative mb-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button 
                      variant="zen" 
                      size="sm" 
                      type="button"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Add Photo
                    </Button>
                  </label>
                </div>
                <Button 
                  variant="motivation" 
                  onClick={handleCreatePost}
                  disabled={isCreatingPost || (!newPost.trim() && !selectedImage)}
                >
                  {isCreatingPost ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Update
                    </>
                  )}
                </Button>
              </div>
            </WellnessCard>

            {/* Activity Feed */}
            <WellnessCard>
              <h2 className="text-lg font-semibold mb-4">Friend Activity</h2>
              <div className="space-y-4 max-h-[855px] overflow-y-auto pr-2">
                {isLoadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="border-b border-muted last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-3">
                        <Avatar 
                          className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => post.user_id && setViewingFriendId(post.user_id)}
                        >
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
                          <MentionText 
                            text={post.content} 
                            className="text-foreground mb-3 block" 
                            onMentionClick={setViewingFriendId}
                          />
                          
                          {/* Like and Comment buttons */}
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 gap-2"
                              onClick={() => handleToggleLike(post)}
                            >
                              <Heart 
                                className={cn(
                                  "w-4 h-4",
                                  post.is_liked_by_user && "fill-red-500 text-red-500"
                                )}
                              />
                              <span className="text-sm">
                                {post.likes_count || 0}
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 gap-2"
                              onClick={() => handleOpenComments(post)}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm">
                                {post.comments_count || 0}
                              </span>
                            </Button>
                          </div>
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

            {/* Co-Workout */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Co-Workout</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Workout together with friends or challenge them to stay motivated!
                </p>
                <Button 
                  variant="zen" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowInviteModal(true)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Invite to Co-Workout
                </Button>
                <Button 
                  variant="motivation" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowChallengeModal(true)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Challenge to Workout
                </Button>
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
                        <AvatarImage src={user.avatar_url} alt={user.username} />
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

            {/* Motivation System */}
            <WellnessCard className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Motivation Hub</h3>
              </div>
              
              <div className="space-y-4 flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground">
                  Need a boost? Request motivation from friends or AI, or spread positivity by motivating others!
                </p>
                
                {/* Request Motivation Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Request Motivation</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="zen" 
                      size="sm" 
                      className="w-full"
                      onClick={handleRequestMotivation}
                      disabled={isRequestingMotivation}
                    >
                      {isRequestingMotivation ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="w-4 h-4 mr-2" />
                      )}
                      {isRequestingMotivation ? "Sending..." : "Ask Friends for Motivation"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Coming Soon!",
                          description: "AI motivation feature is under development.",
                        });
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get AI Motivation
                    </Button>
                  </div>
                </div>

                {/* Give Motivation Section */}
                <div className="space-y-2 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Motivate your friends and help them stay on track with their wellness goals!
                  </p>
                  <Button 
                    variant="motivation" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowMotivationModal(true)}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Motivate a Friend
                  </Button>
                </div>
              </div>
            </WellnessCard>
          </div>
        </div>
      </div>

      {/* Invite to Co-Workout Modal */}
      <Dialog open={showInviteModal} onOpenChange={(open) => {
        setShowInviteModal(open);
        if (!open) {
          setInviteStep(1);
          setWorkoutType("");
          setWorkoutTime("");
          setWorkoutDuration("");
          setWorkoutPlace("");
          setWorkoutNote("");
          setSelectedFriends([]);
          setFriendSearchQuery("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Invite Friend to Co-Workout
            </DialogTitle>
            <DialogDescription>
              {inviteStep === 1 ? "Set workout details for your co-workout session." : "Select friends to invite to your workout."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${inviteStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <div className="w-12 h-0.5 bg-muted"></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${inviteStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
          </div>
          
          <div className="space-y-4 py-4">
            {inviteStep === 1 ? (
              /* Step 1: Workout Details */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-workout-type">Workout Type *</Label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger id="invite-workout-type">
                      <SelectValue placeholder="Select workout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength Training</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-workout-time">Date & Time *</Label>
                    <Input
                      id="invite-workout-time"
                      type="datetime-local"
                      value={workoutTime}
                      onChange={(e) => setWorkoutTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-workout-duration">Duration *</Label>
                    <Select value={workoutDuration} onValueChange={setWorkoutDuration}>
                      <SelectTrigger id="invite-workout-duration">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-workout-place">Place (Optional)</Label>
                  <Input
                    id="invite-workout-place"
                    placeholder="e.g., Central Park, Gold's Gym, Online"
                    value={workoutPlace}
                    onChange={(e) => setWorkoutPlace(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-workout-note">Note (Optional)</Label>
                  <Textarea
                    id="invite-workout-note"
                    placeholder="Add any additional details or instructions..."
                    value={workoutNote}
                    onChange={(e) => setWorkoutNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ) : isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : friends.length > 0 ? (
              /* Step 2: Friend Selection */
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Friends</label>
                  <Command className="border rounded-lg">
                    <CommandInput 
                      placeholder="Search friends..." 
                      value={friendSearchQuery}
                      onValueChange={setFriendSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No friends found.</CommandEmpty>
                      <CommandGroup>
                        {friends
                          .filter(friend => 
                            !friendSearchQuery || 
                            `${friend.first_name} ${friend.last_name}`.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                            friend.username?.toLowerCase().includes(friendSearchQuery.toLowerCase())
                          )
                          .map((friend) => (
                            <CommandItem
                              key={friend.id}
                              value={friend.id}
                              onSelect={() => {
                                setSelectedFriends(prev => {
                                  const isSelected = prev.some(f => f.id === friend.id);
                                  if (isSelected) {
                                    return prev.filter(f => f.id !== friend.id);
                                  } else {
                                    return [...prev, friend];
                                  }
                                });
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                    {friend.first_name[0]}{friend.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {friend.first_name} {friend.last_name}
                                  </p>
                                  {friend.username && (
                                    <p className="text-xs text-muted-foreground">
                                      @{friend.username}
                                    </p>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "w-4 h-4",
                                    selectedFriends.some(f => f.id === friend.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
                
                {selectedFriends.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Friends ({selectedFriends.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFriends.map(friend => (
                        <Badge
                          key={friend.id}
                          variant="secondary"
                          className="px-2 py-1 cursor-pointer hover:bg-destructive/10"
                          onClick={() => setSelectedFriends(prev => prev.filter(f => f.id !== friend.id))}
                        >
                          {friend.first_name} {friend.last_name}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  You don't have any friends yet. Add friends to invite them to workouts!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {inviteStep === 1 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteStep(1);
                    setWorkoutType("");
                    setWorkoutTime("");
                    setWorkoutDuration("");
                    setWorkoutPlace("");
                    setWorkoutNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="zen"
                  disabled={!workoutType || !workoutTime || !workoutDuration}
                  onClick={() => setInviteStep(2)}
                >
                  Next: Select Friends
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setInviteStep(1)}
                >
                  Back
                </Button>
                <Button 
                  variant="zen"
                  disabled={selectedFriends.length === 0}
                  onClick={async () => {
                    if (selectedFriends.length > 0) {
                  try {
                    // Get current user info
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (!currentUser) {
                      throw new Error('User not authenticated');
                    }

                    // Get current user's profile info
                    const { data: userProfile } = await supabase
                      .from('users')
                      .select('first_name, last_name, username')
                      .eq('id', currentUser.id)
                      .single();

                    // Create notifications for all invited friends with workout details
                    const notificationPromises = selectedFriends.map(friend =>
                      notificationService.createNotification({
                        user_id: friend.id,
                        type: 'workout_invitation',
                        title: 'Co-Workout Invitation',
                        message: `${userProfile?.first_name || 'Someone'} ${userProfile?.last_name || ''} invited you to a ${workoutType} workout!`,
                        data: {
                          inviter_id: currentUser.id,
                          inviter_name: `${userProfile?.first_name} ${userProfile?.last_name}`,
                          inviter_username: userProfile?.username,
                          invitation_type: 'co_workout',
                          workout_type: workoutType,
                          workout_time: workoutTime,
                          workout_duration: workoutDuration,
                          workout_place: workoutPlace || null,
                          workout_note: workoutNote || null
                        },
                        read: false
                      }).catch(err => {
                        console.warn(`⚠️ Could not create notification for ${friend.first_name}:`, err);
                        return null;
                      })
                    );
                    
                    await Promise.all(notificationPromises);

                    // TODO: Implement workout scheduling functionality
                    // This will create a co-workout session in the database
                    // - Create a workout_sessions table with fields:
                    //   - id, creator_id, participant_id, workout_type, scheduled_date, status
                    // - Navigate to workout scheduling page or show success message
                    
                    const friendNames = selectedFriends.length === 1
                      ? `${selectedFriends[0].first_name} ${selectedFriends[0].last_name}`
                      : `${selectedFriends.length} friends`;
                    
                    toast({
                      title: "Invitations Sent!",
                      description: `Co-workout invitation sent to ${friendNames}.`,
                    });
                      setShowInviteModal(false);
                      setInviteStep(1);
                      setSelectedFriends([]);
                      setFriendSearchQuery("");
                      setWorkoutType("");
                      setWorkoutTime("");
                      setWorkoutDuration("");
                      setWorkoutPlace("");
                      setWorkoutNote("");
                    } catch (error: any) {
                      console.error('❌ Error sending invitation:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to send invitation. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge to Workout Modal */}
      <Dialog open={showChallengeModal} onOpenChange={(open) => {
        setShowChallengeModal(open);
        if (!open) {
          setChallengeStep(1);
          setWorkoutType("");
          setWorkoutTime("");
          setWorkoutDuration("");
          setWorkoutPlace("");
          setWorkoutNote("");
          setSelectedFriends([]);
          setFriendSearchQuery("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Challenge Friend to Workout
            </DialogTitle>
            <DialogDescription>
              {challengeStep === 1 ? "Set challenge details for your workout competition." : "Select friends to challenge."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${challengeStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <div className="w-12 h-0.5 bg-muted"></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${challengeStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
          </div>
          
          <div className="space-y-4 py-4">
            {challengeStep === 1 ? (
              /* Step 1: Challenge Details */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="challenge-workout-type">Workout Type *</Label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger id="challenge-workout-type">
                      <SelectValue placeholder="Select workout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength Training</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-workout-time">Date & Time *</Label>
                    <Input
                      id="challenge-workout-time"
                      type="datetime-local"
                      value={workoutTime}
                      onChange={(e) => setWorkoutTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="challenge-workout-duration">Duration *</Label>
                    <Select value={workoutDuration} onValueChange={setWorkoutDuration}>
                      <SelectTrigger id="challenge-workout-duration">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenge-workout-place">Place (Optional)</Label>
                  <Input
                    id="challenge-workout-place"
                    placeholder="e.g., Central Park, Gold's Gym, Online"
                    value={workoutPlace}
                    onChange={(e) => setWorkoutPlace(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenge-workout-note">Challenge Note (Optional)</Label>
                  <Textarea
                    id="challenge-workout-note"
                    placeholder="Add challenge rules or details..."
                    value={workoutNote}
                    onChange={(e) => setWorkoutNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ) : isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : friends.length > 0 ? (
              /* Step 2: Friend Selection */
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Friends</label>
                  <Command className="border rounded-lg">
                    <CommandInput 
                      placeholder="Search friends..." 
                      value={friendSearchQuery}
                      onValueChange={setFriendSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No friends found.</CommandEmpty>
                      <CommandGroup>
                        {friends
                          .filter(friend => 
                            !friendSearchQuery || 
                            `${friend.first_name} ${friend.last_name}`.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
                            friend.username?.toLowerCase().includes(friendSearchQuery.toLowerCase())
                          )
                          .map((friend) => (
                            <CommandItem
                              key={friend.id}
                              value={friend.id}
                              onSelect={() => {
                                setSelectedFriends(prev => {
                                  const isSelected = prev.some(f => f.id === friend.id);
                                  if (isSelected) {
                                    return prev.filter(f => f.id !== friend.id);
                                  } else {
                                    return [...prev, friend];
                                  }
                                });
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                    {friend.first_name[0]}{friend.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {friend.first_name} {friend.last_name}
                                  </p>
                                  {friend.username && (
                                    <p className="text-xs text-muted-foreground">
                                      @{friend.username}
                                    </p>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "w-4 h-4",
                                    selectedFriends.some(f => f.id === friend.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
                
                {selectedFriends.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Friends ({selectedFriends.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFriends.map(friend => (
                        <Badge
                          key={friend.id}
                          variant="secondary"
                          className="px-2 py-1 cursor-pointer hover:bg-destructive/10"
                          onClick={() => setSelectedFriends(prev => prev.filter(f => f.id !== friend.id))}
                        >
                          {friend.first_name} {friend.last_name}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  You don't have any friends yet. Add friends to challenge them!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {challengeStep === 1 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowChallengeModal(false);
                    setChallengeStep(1);
                    setWorkoutType("");
                    setWorkoutTime("");
                    setWorkoutDuration("");
                    setWorkoutPlace("");
                    setWorkoutNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="motivation"
                  disabled={!workoutType || !workoutTime || !workoutDuration}
                  onClick={() => setChallengeStep(2)}
                >
                  Next: Select Friends
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setChallengeStep(1)}
                >
                  Back
                </Button>
                <Button 
                  variant="motivation"
                  disabled={selectedFriends.length === 0}
                  onClick={async () => {
                    if (selectedFriends.length > 0) {
                  try {
                    // Get current user info
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (!currentUser) {
                      throw new Error('User not authenticated');
                    }

                    // Get current user's profile info
                    const { data: userProfile } = await supabase
                      .from('users')
                      .select('first_name, last_name, username')
                      .eq('id', currentUser.id)
                      .single();

                      // Create notifications for all challenged friends with workout details
                      const notificationPromises = selectedFriends.map(friend =>
                        notificationService.createNotification({
                          user_id: friend.id,
                          type: 'workout_challenge',
                          title: 'Workout Challenge',
                          message: `${userProfile?.first_name || 'Someone'} ${userProfile?.last_name || ''} challenged you to a ${workoutType} workout competition!`,
                          data: {
                            challenger_id: currentUser.id,
                            challenger_name: `${userProfile?.first_name} ${userProfile?.last_name}`,
                            challenger_username: userProfile?.username,
                            challenge_type: 'workout_challenge',
                            workout_type: workoutType,
                            workout_time: workoutTime,
                            workout_duration: workoutDuration,
                            workout_place: workoutPlace || null,
                            workout_note: workoutNote || null
                          },
                          read: false
                        }).catch(err => {
                          console.warn(`⚠️ Could not create notification for ${friend.first_name}:`, err);
                          return null;
                        })
                      );
                      
                      await Promise.all(notificationPromises);

                      // TODO: Implement workout challenge functionality
                      // This will create a workout challenge in the database
                      // - Create a workout_challenges table with fields:
                      //   - id, challenger_id, challenged_id, workout_type, challenge_date, 
                      //     status (pending/accepted/declined/completed), winner_id
                      // - Track workout metrics for both users
                      // - Determine winner based on performance metrics
                      // - Award points/badges to the winner
                      
                      const friendNames = selectedFriends.length === 1
                        ? `${selectedFriends[0].first_name} ${selectedFriends[0].last_name}`
                        : `${selectedFriends.length} friends`;
                      
                      toast({
                        title: "Challenges Sent!",
                        description: `Workout challenge sent to ${friendNames}.`,
                      });
                      setShowChallengeModal(false);
                      setChallengeStep(1);
                      setSelectedFriends([]);
                      setFriendSearchQuery("");
                      setWorkoutType("");
                      setWorkoutTime("");
                      setWorkoutDuration("");
                      setWorkoutPlace("");
                      setWorkoutNote("");
                    } catch (error: any) {
                      console.error('❌ Error sending challenge:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to send challenge. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Send Challenge
              </Button>
            </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Motivate Friends Modal */}
      <Dialog open={showMotivationModal} onOpenChange={(open) => {
        setShowMotivationModal(open);
        if (!open) {
          setSelectedMotivationFriends([]);
          setMotivationMessage("");
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Send Motivation to Friends</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select friends and write a motivational message to brighten their day!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {/* Friend Selection */}
            {isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : friends.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Select Friends to Motivate</Label>
                  <div className="border rounded-lg max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                    <div className="p-1 sm:p-2 space-y-1">
                      {friends.map((friend) => {
                        const isSelected = selectedMotivationFriends.some(f => f.id === friend.id);
                        return (
                          <div
                            key={friend.id}
                            className={cn(
                              "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors",
                              isSelected ? "bg-primary/10 border-2 border-primary" : "hover:bg-muted/50 border-2 border-transparent"
                            )}
                            onClick={() => {
                              setSelectedMotivationFriends(prev => {
                                if (isSelected) {
                                  return prev.filter(f => f.id !== friend.id);
                                } else {
                                  return [...prev, friend];
                                }
                              });
                            }}
                          >
                            <div className={cn(
                              "w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" />}
                            </div>
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-primary text-white text-xs sm:text-sm">
                                {friend.first_name[0]}{friend.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {friend.first_name} {friend.last_name}
                              </p>
                              {friend.username && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  @{friend.username}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {selectedMotivationFriends.length > 0 && (
                  <div className="p-2 sm:p-3 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm font-medium mb-2">
                      Selected ({selectedMotivationFriends.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedMotivationFriends.map(friend => (
                        <Badge
                          key={friend.id}
                          variant="secondary"
                          className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs cursor-pointer hover:bg-destructive/10"
                          onClick={() => setSelectedMotivationFriends(prev => prev.filter(f => f.id !== friend.id))}
                        >
                          <span className="truncate max-w-[120px] sm:max-w-none">
                            {friend.first_name} {friend.last_name}
                          </span>
                          <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 flex-shrink-0" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Motivation Message */}
                <div className="space-y-2">
                  <Label htmlFor="motivation-message" className="text-sm">Your Motivational Message</Label>
                  <Textarea
                    id="motivation-message"
                    placeholder="Write something inspiring to motivate your friends... 💪"
                    value={motivationMessage}
                    onChange={(e) => setMotivationMessage(e.target.value)}
                    rows={4}
                    className="resize-none text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {motivationMessage.length} characters
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  You don't have any friends yet. Add friends to motivate them!
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMotivationModal(false);
                setSelectedMotivationFriends([]);
                setMotivationMessage("");
              }}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button 
              variant="motivation"
              disabled={selectedMotivationFriends.length === 0 || !motivationMessage.trim() || isSendingMotivation}
              onClick={handleSendMotivation}
              className="w-full sm:w-auto text-sm"
            >
              {isSendingMotivation ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
              )}
              {isSendingMotivation ? "Sending..." : "Send Motivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              myPosts.map((post) => {
                const isHighlighted = location.state?.highlightPostId === post.id;
                return (
                <div 
                  key={post.id} 
                  ref={isHighlighted ? highlightedPostRef : null}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${
                    isHighlighted ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                >
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
                          <MentionText 
                            text={post.content} 
                            className="text-foreground mb-3 block" 
                            onMentionClick={setViewingFriendId}
                          />
                          
                          {/* Like and Comment Stats */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-2"
                                onClick={() => handleToggleLike(post)}
                              >
                                <Heart 
                                  className={cn(
                                    "w-4 h-4",
                                    post.is_liked_by_user && "fill-red-500 text-red-500"
                                  )}
                                />
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-8 px-1 text-sm underline-offset-4 hover:underline"
                                onClick={() => handleViewLikes(post)}
                                disabled={!post.likes_count}
                              >
                                {post.likes_count || 0} {post.likes_count === 1 ? 'like' : 'likes'}
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 gap-2"
                              onClick={() => handleOpenComments(post)}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm">
                                {post.comments_count || 0}
                              </span>
                            </Button>
                          </div>
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
              );
              })
            ) : (
              <p className="text-muted-foreground text-center py-8">
                You haven't created any posts yet. Share your first workout update!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              {selectedPost && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-primary text-white text-xs">
                        {selectedPost.user?.first_name?.[0]}{selectedPost.user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">
                        {selectedPost.user?.first_name} {selectedPost.user?.last_name}
                      </span>
                      {selectedPost.user?.username && (
                        <span className="text-xs text-muted-foreground ml-2">
                          @{selectedPost.user.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{selectedPost.content}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-b border-muted pb-4 last:border-0">
                    <div className="flex items-start gap-3">
                      <Avatar 
                        className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => {
                          if (comment.user_id) {
                            setShowCommentsModal(false);
                            setViewingFriendId(comment.user_id);
                          }
                        }}
                      >
                        <AvatarFallback className="bg-gradient-primary text-white text-xs">
                          {comment.user?.first_name?.[0]}{comment.user?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.user?.first_name} {comment.user?.last_name}
                          </span>
                          {comment.user?.username && (
                            <span className="text-xs text-muted-foreground">
                              @{comment.user.username}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{comment.content}</p>
                        
                        {/* Comment actions */}
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1"
                            onClick={() => handleToggleCommentLike(comment)}
                          >
                            <Heart 
                              className={cn(
                                "w-3 h-3",
                                comment.is_liked_by_user && "fill-red-500 text-red-500"
                              )}
                            />
                            <span className="text-xs">
                              {comment.likes_count || 0}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleLoadReplies(comment.id)}
                          >
                            {expandedCommentId === comment.id ? 'Hide' : 'Reply'} 
                            {comment.replies_count ? ` (${comment.replies_count})` : ''}
                          </Button>
                        </div>

                        {/* Replies section */}
                        {expandedCommentId === comment.id && (
                          <div className="mt-3 ml-4 space-y-3">
                            {/* Existing replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex items-start gap-2">
                                    <Avatar 
                                      className="w-6 h-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                      onClick={() => {
                                        if (reply.user_id) {
                                          setShowCommentsModal(false);
                                          setViewingFriendId(reply.user_id);
                                        }
                                      }}
                                    >
                                      <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                        {reply.user?.first_name?.[0]}{reply.user?.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-xs">
                                          {reply.user?.first_name} {reply.user?.last_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(reply.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-xs">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply input */}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Write a reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostReply(comment);
                                  }
                                }}
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                variant="zen"
                                onClick={() => handlePostReply(comment)}
                                disabled={isPostingReply || !replyContent.trim()}
                              >
                                {isPostingReply ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No comments yet. Be the first to comment!
              </p>
            )}

            {/* New Comment Input */}
            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <Button
                variant="zen"
                onClick={handlePostComment}
                disabled={isPostingComment || !newComment.trim()}
              >
                {isPostingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Likes Modal */}
      <Dialog open={showLikesModal} onOpenChange={setShowLikesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Likes</DialogTitle>
            <DialogDescription>
              People who liked this post
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {isLoadingLikes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : postLikes.length > 0 ? (
              postLikes.map((like) => (
                <div key={like.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {like.user?.first_name?.[0]}{like.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {like.user?.first_name} {like.user?.last_name}
                    </p>
                    {like.user?.username && (
                      <p className="text-xs text-muted-foreground">
                        @{like.user.username}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No likes yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Post Modal */}
      <Dialog open={showSinglePostModal} onOpenChange={setShowSinglePostModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post</DialogTitle>
            <DialogDescription>
              View post and comments
            </DialogDescription>
          </DialogHeader>

          {isLoadingSinglePost ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : singlePost ? (
            <div className="space-y-4">
              {/* Post Content */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {singlePost.user?.first_name?.[0]}{singlePost.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {singlePost.user?.first_name} {singlePost.user?.last_name}
                      </span>
                      {singlePost.user?.username && (
                        <span className="text-sm text-muted-foreground">
                          @{singlePost.user.username}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(singlePost.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-foreground mb-3">{singlePost.content}</p>
                    
                    {/* Like and Comment buttons */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-2"
                        onClick={() => handleToggleLike(singlePost)}
                      >
                        <Heart 
                          className={cn(
                            "w-4 h-4",
                            singlePost.is_liked_by_user && "fill-red-500 text-red-500"
                          )}
                        />
                        <span className="text-sm">
                          {singlePost.likes_count || 0}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-2"
                        onClick={() => handleOpenComments(singlePost)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {singlePost.comments_count || 0}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Post not found
            </p>
          )}
        </DialogContent>
      </Dialog>
    </WellnessLayout>
  );
}