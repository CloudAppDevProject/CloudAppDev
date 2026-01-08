"use client";

import React from "react";
import { MegaMenu } from "primereact/megamenu";
import { Avatar } from "primereact/avatar";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function Menu() {
  const router = useRouter();
  const pathname = usePathname();

  // 💡 KORRIGIERT: avatarUrl zum Destrukturieren hinzugefügt
  const { user, avatarUrl } = useUser();

  // Menü ausblenden auf Login/Register-Seiten
  if (pathname === "/login" || pathname === "/register") return null;

  let menuEndContent;

  // Die Quelle des Avatar-Bildes: entweder die geladene signierte URL oder der Standard-Fallback
  const imageSource = avatarUrl || "/default-avatar.png";

  if (user) {
    // Benutzer ist eingeloggt
    menuEndContent = (
      <Avatar
        image={imageSource} // Verwendet die signierte URL
        shape="circle"
        onClick={() => router.push("/profile")}
      />
    );
  } else {
    // Benutzer ist ausgeloggt oder die Daten werden noch geladen (Fallback)
    menuEndContent = (
      <Avatar
        icon="pi pi-user" // Zeigt ein Standard-Icon
        shape="circle"
        onClick={() => router.push("/login")} // Leitet zur Login-Seite
        style={{ backgroundColor: "#999", color: "#fff" }}
      />
    );
  }

  // Helper to check if a path is active
  const isActive = (path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const items = [
    {
      label: "My Itineraries",
      command: () => router.push("/"),
      className: isActive("/") && pathname === "/" ? "p-menuitem-active" : ""
    },
    {
      label: "All Itineraries",
      command: () => router.push("/itineraries"),
      className: isActive("/itineraries") ? "p-menuitem-active" : ""
    },
    ...(user && user.tenantId === 1
      ? [{
          label: "Create Organization",
          icon: "pi pi-star",
          command: () => router.push("/upgrade"),
          className: `text-blue-600 font-semibold${isActive("/upgrade") ? " p-menuitem-active" : ""}`
        }]
      : []),
    ...(user && user.role === 'admin'
      ? [
          {
            label: "Admin Panel",
            command: () => router.push("/admin/tenant"),
            className: isActive("/admin/tenant") ? "p-menuitem-active" : ""
          },
          {
            label: "Monitoring",
            icon: "pi pi-chart-line",
            command: () => router.push("/admin/monitoring"),
            className: `text-purple-600 font-semibold${isActive("/admin/monitoring") ? " p-menuitem-active" : ""}`
          }
        ]
      : []),
  ];

  return (
    <div className="card p-5">
      <MegaMenu model={items} breakpoint="960px" end={menuEndContent} />
    </div>
  );
}
