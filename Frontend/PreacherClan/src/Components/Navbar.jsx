import React, { useState } from "react";
import { Link, redirect, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Info,
  Shield,
  HelpCircle,
  MessageCircle,
  Bell,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext"; // adjust this import path

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    redirect("/");
  }
  const navigate = useNavigate();
  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const { notifications } = useNotification(); // 👈 Use notifications from context

  return (
    <nav className="bg-zinc-950 bg-opacity-95 shadow-md border-b border-zinc-900 fixed z-50 inset-x-0 top-0">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 py-4">
        {/* Left: Logo & Avatar */}
        <Link to="/profile" className="flex items-center space-x-3">
          <div className="p-1 rounded-full bg-zinc-950">
            <MessageSquare size={22} className="text-zinc-300" />
          </div>
          <img
            src="https://www.tvinsider.com/wp-content/uploads/2024/07/john-cena-1014x570.jpg"
            alt="Avatar"
            className="h-8 w-8 rounded-full object-cover border border-zinc-800"
          />
          <p className="text-zinc-300 text-xs">Hi {user.name}</p>
        </Link>

        {/* Right: Notification + Hamburger */}
        <div className="flex items-center space-x-4">
          {/* Notification Icon */}
          <div
            className="relative cursor-pointer group"
            onClick={() => handleNavigate("/notifications")}
          >
            <span className="sr-only">Notifications</span>
            <Bell className="text-zinc-300 hover:text-white" size={20} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </div>

          {/* Hamburger (Mobile) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-zinc-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 p-2 rounded-lg"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex md:-mt-4 space-x-6 text-sm">
          <NavLinks />
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-zinc-950 border-t w-full border-zinc-800">
          <ul className="flex flex-col p-4 space-y-2 w-full text-sm">
            <NavLinks onClick={() => setIsOpen(false)} />
          </ul>
        </div>
      )}
    </nav>
  );
}

const iconClasses = "inline-block mr-1 h-4 w-4 stroke-zinc-400";

const NavLinks = ({ onClick }) => {
  const links = [
    { to: "/", label: "About", Icon: Info },
    { to: "/services", label: "Pledge", Icon: Shield },
    { to: "/pricing", label: "Support", Icon: HelpCircle },
    { to: "/contact", label: "Feedback", Icon: MessageCircle },
  ];

  return (
    <>
      {links.map(({ to, label, Icon }) => (
        <li key={to} className="w-full h-full">
          <Link
            to={to}
            onClick={onClick}
            className="px-3 w-full rounded-sm text-zinc-300 hover:text-white py-2 hover:bg-zinc-900 md:hover:bg-transparent md:p-0 md:hover:text-zinc-500 transition block flex items-center"
          >
            <Icon size={16} className={iconClasses} />
            {label}
          </Link>
        </li>
      ))}
    </>
  );
};

export default Navbar;
