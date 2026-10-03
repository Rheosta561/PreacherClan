import React from "react";
import { Bell, ShieldCheck, XCircle, Trash2 } from "lucide-react";
import { useNotification } from "../context/NotificationContext"; // adjust the path if needed
import BottomRow from "../Components/bottomRow";

function Notifications() {
  const { notifications, setNotifications } = useNotification();
    // Use context here
    const Notifications = localStorage.getItem('notifications') ? JSON.parse(localStorage.getItem('notifications')) : [];

  const clearAll = () => {setNotifications([]);
    localStorage.removeItem('notifications');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <BottomRow/>
      <div className="flex items-center justify-between mb-6 mt-16">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-400" />
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        </div>
        {Notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400 hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-zinc-500 text-sm text-center mt-20">
          🧘 No notifications. You are at peace, warrior.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((note, index) => (   // Use index as fallback key if no id
            <div
              key={note._id || index}   // Your real-time notifications will have _id
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-base font-medium text-zinc-100">
                    {note.title || "📢 New Notification"}
                  </h2>
                  <p className="text-sm text-zinc-300">{note.message}</p>
                </div>
                {note.type === "rejected" && (
                  <XCircle className="text-red-500 w-4 h-4 mt-1" />
                )}
                {note.type === "matched" && (
                  <ShieldCheck className="text-green-500 w-4 h-4 mt-1" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {note.time || new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
