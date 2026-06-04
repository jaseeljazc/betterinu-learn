"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle } from "lucide-react";
import { NotificationBell } from "@/components/tasks/notification-bell";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AdminTopHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-2 border-b bg-white px-6">
      <TooltipProvider delayDuration={0}>
        {/* Pass collapsed={false} so it renders as a compact square icon button, aligning perfectly on the right */}
        <NotificationBell collapsed={false} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/admin/profile">
              <Button
                variant="ghost"
                size="icon"
                className={pathname.startsWith("/admin/profile") ? "bg-primary/10 text-primary" : "text-secondary hover:text-primary"}
              >
                <UserCircle className="size-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">My Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
