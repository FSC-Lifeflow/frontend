import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface MentionTextProps {
  text: string;
  className?: string;
  onMentionClick?: (userId: string) => void;
}

export function MentionText({ text, className = "", onMentionClick }: MentionTextProps) {
  const navigate = useNavigate();
  
  // Split text into parts: regular text and @mentions
  const parts = text.split(/(@\w+)/g);
  
  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Look up user ID by username
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
      
      if (error || !user) {
        console.error('User not found:', username);
        return;
      }
      
      // If onMentionClick callback is provided, use it (for Social page)
      if (onMentionClick) {
        onMentionClick(user.id);
      } else {
        // Otherwise navigate to social page with state
        navigate('/social', { state: { viewFriendId: user.id } });
      }
    } catch (error) {
      console.error('Error looking up mentioned user:', error);
    }
  };
  
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.substring(1); // Remove @ symbol
          return (
            <button
              key={i}
              onClick={(e) => handleMentionClick(e, username)}
              className="text-blue-300 hover:text-blue-200 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 inline"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
