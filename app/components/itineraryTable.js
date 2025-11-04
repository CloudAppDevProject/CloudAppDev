"use client";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import LikeButton from "@/app/components/LikeButton";

export default function ItineraryTable({
  itineraries,
  loading,
  search,
  onSearchChange,
  userId,
  onRowClick,
  onLikeChange,
  lazy = false,
  first = 0,
  rows = 10,
  totalRecords = 0,
  onPage,
}) {
  const dateFormatter = (rowData) => {
    const dateString = rowData.start_date;
    if (!dateString) return "";

    try {
      // Erstellt ein Date-Objekt aus dem String
      const date = new Date(dateString);

      // Nutzt Intl.DateTimeFormat für lokalisierte, saubere Formatierung
      // Hier im Format 'de-DE' (z.B. 04.11.2025). Passen Sie 'en-US' für MM/DD/YYYY an.
      return new Intl.DateTimeFormat("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC", // Wichtig, um die Datumskonvertierung zu steuern
      }).format(date);
    } catch (error) {
      console.error("Datum Formatierungsfehler:", error);
      return dateString; // Zeigt den Original-String im Fehlerfall an
    }
  };

  // --- Like Button Template ---
  const likeBodyTemplate = (rowData) => (
    <LikeButton itineraryId={rowData.id} userId={userId} initialLiked={rowData.userHasLiked || false} initialCount={rowData.likeCount || 0} onLikeChange={onLikeChange} />
  );

  // --- Header mit Search ---
  const header = (
    <div className="flex justify-between items-center gap-4">
      <InputText value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search itineraries..." className="w-full md:w-1/3 p-inputtext-sm" />
    </div>
  );

  // --- Row Click Handler ---
  const handleRowClick = (event) => {
    if (onRowClick) onRowClick(event.data.id);
  };

  return (
    <div className="rounded-md shadow-md overflow-hidden">
      <DataTable
        value={itineraries}
        dataKey="id"
        loading={loading}
        lazy={lazy}
        paginator
        first={first}
        rows={rows}
        totalRecords={totalRecords}
        onPage={onPage}
        rowsPerPageOptions={[5, 10, 20, 25, 50]}
        selectionMode="single"
        onRowClick={handleRowClick}
        sortMode="single"
        header={header}
        emptyMessage="No itineraries found."
        className="p-datatable-sm"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
      >
        <Column field="title" header="Title" sortable />
        <Column field="destination" header="Destination" sortable />
        <Column field="start_date" header="Start Date" body={dateFormatter} sortable />
        <Column header="Likes" body={likeBodyTemplate} />
      </DataTable>
    </div>
  );
}
