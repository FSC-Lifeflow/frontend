import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, MapPin, Clock, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { messageService, type WorkoutInvitationData } from '@/services/messageService';
import { toast } from 'sonner';

interface WorkoutInvitationCardProps {
  messageId: string;
  workoutData: WorkoutInvitationData;
  senderId: string;
  senderName: string;
  currentUserId: string;
  participants: Array<{
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  }>;
}

export function WorkoutInvitationCard({
  messageId,
  workoutData,
  senderId,
  senderName,
  currentUserId,
  participants
}: WorkoutInvitationCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  
  const isOwnInvitation = senderId === currentUserId;
  const hasAccepted = workoutData.accepted_by?.includes(currentUserId);
  const hasDeclined = workoutData.declined_by?.includes(currentUserId);
  const hasResponded = hasAccepted || hasDeclined;

  const startDate = workoutData.event_start ? new Date(workoutData.event_start) : null;
  const endDate = workoutData.event_end ? new Date(workoutData.event_end) : null;

  const handleResponse = async (action: 'accept' | 'decline') => {
    try {
      setIsResponding(true);
      console.log('🎯 Updating workout invitation response:', { messageId, currentUserId, action });
      
      await messageService.updateWorkoutInvitationResponse(messageId, currentUserId, action);
      
      console.log('✅ Workout invitation response updated successfully');
      
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        toast.success(
          action === 'accept' 
            ? '✅ You accepted the workout invitation!' 
            : '❌ You declined the workout invitation'
        );
      }, 0);
    } catch (error) {
      console.error('❌ Error responding to invitation:', error);
      setTimeout(() => {
        toast.error('Failed to respond to invitation. Please try again.');
      }, 0);
    } finally {
      setIsResponding(false);
    }
  };

  const getParticipantName = (userId: string) => {
    const participant = participants.find(p => p.id === userId);
    if (!participant) return 'Someone';
    return participant.first_name && participant.last_name
      ? `${participant.first_name} ${participant.last_name}`
      : participant.username;
  };

  const getParticipantDetails = (userId: string) => {
    return participants.find(p => p.id === userId);
  };

  const acceptedCount = workoutData.accepted_by?.length || 0;
  const declinedCount = workoutData.declined_by?.length || 0;
  const acceptedParticipants = workoutData.accepted_by?.map(getParticipantName) || [];
  const declinedParticipants = workoutData.declined_by?.map(getParticipantName) || [];
  const acceptedParticipantDetails = workoutData.accepted_by?.map(getParticipantDetails).filter(Boolean) || [];

  // Debug: Log when accepted/declined counts change
  useEffect(() => {
    console.log('🔄 WorkoutInvitationCard counts updated:', {
      messageId,
      acceptedCount,
      declinedCount
    });
  }, [acceptedCount, declinedCount, messageId]);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-wellness-50 to-zen-50">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base mb-1">
              {workoutData.event_summary}
            </h4>
            <p className="text-xs text-muted-foreground">
              Invited by {senderName}
            </p>
          </div>
          
          {/* Accepted Participants Avatars */}
          {acceptedParticipantDetails.length > 0 && (
            <div className="flex-shrink-0">
              <TooltipProvider>
                <div className="flex -space-x-2">
                  {acceptedParticipantDetails.slice(0, 3).map((participant, idx) => (
                    <Tooltip key={participant.id} delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-green-500/30">
                          <AvatarImage src={participant.avatar_url} />
                          <AvatarFallback className="text-xs bg-green-100 text-green-700">
                            {participant.first_name?.[0] || participant.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-sm">
                          {participant.first_name && participant.last_name
                            ? `${participant.first_name} ${participant.last_name}`
                            : participant.username}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {acceptedParticipantDetails.length > 3 && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div className="w-8 h-8 rounded-full border-2 border-background ring-2 ring-green-500/30 bg-green-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-green-700">
                            +{acceptedParticipantDetails.length - 3}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-sm">
                          {acceptedParticipantDetails.slice(3).map((p, idx) => (
                            <p key={p.id}>
                              {p.first_name && p.last_name
                                ? `${p.first_name} ${p.last_name}`
                                : p.username}
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-3">
          {startDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>
                {format(startDate, 'EEE, MMM d, yyyy • h:mm a')}
                {endDate && ` - ${format(endDate, 'h:mm a')}`}
              </span>
            </div>
          )}
          
          {workoutData.event_location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{workoutData.event_location}</span>
            </div>
          )}

          {workoutData.event_description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {workoutData.event_description}
            </p>
          )}
        </div>

        {/* Participant Responses - Show who accepted and declined */}
        {(acceptedCount > 0 || declinedCount > 0) && (
          <div className="space-y-2 mb-3 p-3 bg-background/50 rounded-lg border border-border/50">
            {acceptedCount > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-fit">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-700" />
                  </div>
                  <span className="text-xs font-medium text-green-700">Accepted</span>
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {acceptedParticipants.map((name, idx) => (
                    <span key={idx} className="text-xs text-muted-foreground">
                      {name}{idx < acceptedParticipants.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {declinedCount > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-fit">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-red-700" />
                  </div>
                  <span className="text-xs font-medium text-red-700">Declined</span>
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {declinedParticipants.map((name, idx) => (
                    <span key={idx} className="text-xs text-muted-foreground">
                      {name}{idx < declinedParticipants.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isOwnInvitation && (
          <div className="flex gap-2 pt-2 border-t">
            {hasResponded ? (
              <div className="flex items-center gap-2 text-sm">
                {hasAccepted ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">You accepted this invitation</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">You declined this invitation</span>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResponse(hasAccepted ? 'decline' : 'accept')}
                  disabled={isResponding}
                  className="ml-auto h-7 text-xs"
                >
                  Change Response
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="wellness"
                  size="sm"
                  onClick={() => handleResponse('accept')}
                  disabled={isResponding}
                  className="flex-1"
                >
                  {isResponding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResponse('decline')}
                  disabled={isResponding}
                  className="flex-1"
                >
                  {isResponding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Own Invitation Status */}
        {isOwnInvitation && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              You sent this invitation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
