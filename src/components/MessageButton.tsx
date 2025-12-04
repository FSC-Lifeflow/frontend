import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { messageService } from "@/services/messageService";
import { toast } from "sonner";

interface MessageButtonProps {
  userId: string;
  userName?: string;
  variant?: "default" | "outline" | "ghost" | "wellness" | "zen" | "motivation";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Button component to start a direct message with a user
 * Automatically creates or retrieves the chat room and navigates to Messages page
 */
export function MessageButton({ 
  userId, 
  userName,
  variant = "outline", 
  size = "sm",
  className 
}: MessageButtonProps) {
  const navigate = useNavigate();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleStartChat = async () => {
    try {
      setIsCreatingChat(true);
      
      // Get or create direct chat with the user
      const chatRoomId = await messageService.getOrCreateDirectChat(userId);
      
      // Navigate to Messages page
      // The Messages page will automatically load the chat rooms
      navigate('/messages', { state: { selectedChatId: chatRoomId } });
      
      if (userName) {
        toast.success(`Opening chat with ${userName}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartChat}
      disabled={isCreatingChat}
      className={className}
    >
      {isCreatingChat ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          Message
        </>
      )}
    </Button>
  );
}
