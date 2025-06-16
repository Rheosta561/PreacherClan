import React from 'react';

function ChatCard({
  username,
  latestMessage,
  timestamp,
  profileImage,
  isGroup = false,
  participants = [],
  unreadCount = 0
}) {
  // Format participant string like: You, Bjorn, +2 more
  const getParticipantPreview = () => {
    const visible = participants.slice(0, 2);
    const remaining = participants.length - visible.length;

    return remaining > 0
      ? `${visible.join(', ')}, +${remaining} more`
      : visible.join(', ');
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors">
      
      {/* Left side: Avatar + Info */}
      <div className="flex items-center gap-4">
        <img
          src={profileImage}
          alt={`${username}'s avatar`}
          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
        />

        <div className="flex flex-col">
          <span className="text-white font-semibold text-base">{username}</span>

          {isGroup ? (
            <span className="text-zinc-400 text-sm truncate max-w-[200px]">
              {getParticipantPreview()}
            </span>
          ) : (
            <span className="text-zinc-400 text-sm truncate max-w-[200px]">
              {latestMessage}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Time & unread count */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-zinc-500 whitespace-nowrap">{timestamp}</span>
        {unreadCount > 0 && (
          <span className="text-xs bg-red-800 text-white px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatCard;
