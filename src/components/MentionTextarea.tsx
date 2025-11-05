import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { friendService } from "@/services/friendService";
import { SearchUser } from "@/services/userService";
import { Loader2 } from "lucide-react";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<SearchUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load friends on mount
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const friendsList = await friendService.getFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error("Failed to load friends:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadFriends();
  }, []);

  // Handle text changes and detect @ mentions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Check if we're in a mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      
      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        // We're in a mention
        setMentionStartPos(lastAtSymbol);
        setMentionQuery(textAfterAt.toLowerCase());
        
        // Filter friends based on query
        const filtered = friends.filter(friend => {
          const fullName = `${friend.first_name} ${friend.last_name}`.toLowerCase();
          const username = friend.username?.toLowerCase() || '';
          return fullName.includes(textAfterAt.toLowerCase()) || 
                 username.includes(textAfterAt.toLowerCase());
        });
        
        setFilteredFriends(filtered);
        setShowDropdown(filtered.length > 0);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }
  };

  // Insert selected friend mention
  const insertMention = (friend: SearchUser) => {
    if (mentionStartPos === null || !textareaRef.current) return;

    const username = friend.username || `${friend.first_name}${friend.last_name}`;
    const beforeMention = value.substring(0, mentionStartPos);
    const afterCursor = value.substring(textareaRef.current.selectionStart);
    
    const newValue = `${beforeMention}@${username} ${afterCursor}`;
    onChange(newValue);
    
    // Set cursor position after the mention
    const newCursorPos = mentionStartPos + username.length + 2; // +2 for @ and space
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
    
    setShowDropdown(false);
    setMentionStartPos(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredFriends.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        if (filteredFriends[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredFriends[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current && showDropdown) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showDropdown]);

  // Calculate dropdown position
  const getCaretCoordinates = () => {
    if (!textareaRef.current || mentionStartPos === null) return { top: 0, left: 0 };
    
    // Create a mirror div to calculate caret position
    const textarea = textareaRef.current;
    const textBeforeCaret = value.substring(0, mentionStartPos);
    
    // Simple approximation - position below textarea
    return {
      top: textarea.offsetHeight,
      left: 0
    };
  };

  const dropdownPosition = getCaretCoordinates();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
          }}
        >
          {isLoadingFriends ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : filteredFriends.length > 0 ? (
            filteredFriends.map((friend, index) => (
              <div
                key={friend.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => insertMention(friend)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                    {friend.first_name[0]}{friend.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {friend.first_name} {friend.last_name}
                  </p>
                  {friend.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{friend.username}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No friends found
            </div>
          )}
        </div>
      )}
      
      {showDropdown && (
        <div className="text-xs text-muted-foreground mt-1">
          Use ↑↓ to navigate, Enter to select, Esc to cancel
        </div>
      )}
    </div>
  );
}
