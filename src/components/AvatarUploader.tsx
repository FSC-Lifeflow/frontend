import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  className?: string;
};

export const AvatarUploader: React.FC<Props> = ({ className }) => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const initials = useMemo(() => {
    const first = user?.first_name?.[0] ?? "";
    const last = user?.last_name?.[0] ?? "";
    return (first + last || user?.email?.[0] || "U").toUpperCase();
  }, [user]);

  const handlePick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setUploading(true);
      const url = await authService.uploadAvatar(user.id, file);
      await refreshUser();
      toast({ title: "Profile photo updated", description: "Your avatar has been updated." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <Avatar className="h-16 w-16">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <AvatarImage src={user?.avatar_url || undefined} />
        <AvatarFallback className="text-base">{initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          PNG, JPG, or WEBP up to 5MB
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={onFileChange}
          />
          <Button variant="wellness" size="sm" onClick={handlePick} disabled={uploading}>
            {uploading ? "Uploading..." : "Change Photo"}
          </Button>
          {user?.avatar_url && (
            <a
              href={user.avatar_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              View current
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
