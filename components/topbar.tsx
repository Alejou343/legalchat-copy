"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { UserDropdown } from "@/components/user-dropdown";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render the correct logo after component has mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use white logo for dark theme and black logo for light theme
  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/alcock-white.png"
      : "/alcock-black.png";

  // Function to handle new chat creation
  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('resetChat'));
  };

  return (
    <div className="flex items-center justify-between">
      <div className="h-16 w-auto">
        {mounted ? (
          <Image
            src={logoSrc}
            alt="Company Logo"
            width={150}
            height={40}
            priority
            className="h-full w-auto"
          />
        ) : (
          <div className="h-full w-[150px]" /> // Placeholder while loading
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          title="New Chat"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <UserDropdown />
      </div>
    </div>
  );
}
