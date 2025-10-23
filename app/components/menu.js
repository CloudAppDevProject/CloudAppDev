"use client";

import React from "react";
import { MegaMenu } from "primereact/megamenu";
import { Avatar } from "primereact/avatar";
import { usePathname, useRouter } from "next/navigation";

export default function Menu() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const end = <Avatar image="https://primefaces.org/cdn/primereact/images/avatar/amyelsner.png" shape="circle" onClick={() => router.push("/profile")} />;

  const items = [{ label: "My Itineraries", command: () => router.push("/") }, { label: "All Itineraries", command: () => router.push("/itineraries") }];

  return (
    <div className="card p-5">
      <MegaMenu model={items} breakpoint="960px" end={end} />
    </div>
  );
}
