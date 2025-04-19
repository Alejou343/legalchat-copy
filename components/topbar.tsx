"use client"

import { UserDropdown } from "@/components/user-dropdown"

export function Topbar() {
  return (
    <div className="flex justify-end">
        <UserDropdown />
    </div>
  )
} 