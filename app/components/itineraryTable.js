"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

export default function ItineraryTable({
  list,
  loading,
  globalFilterValue,
  setGlobalFilterValue,
  onRowClick,
  onAddNew,
}) {
  const renderHeader = () => (
    <div className="flex justify-between items-center">
      <span className="p-input-icon-left">
        <InputText
          value={globalFilterValue}
          onChange={(e) => setGlobalFilterValue(e.target.value)}
          placeholder="Search by title, destination, or date"
        />
      </span>
      <Button
        icon="pi pi-plus"
        label="Add New"
        onClick={onAddNew}
        title="Add new itinerary"
      />
    </div>
  );

  const header = renderHeader();

  return (
    <div className="rounded-md shadow-md overflow-hidden">
      <DataTable
        value={list}
        dataKey="id"
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        selectionMode="single"
        onRowClick={onRowClick}
        sortMode="single"
        header={header}
        emptyMessage="No itineraries found."
        className="p-datatable-sm"
      >
        <Column field="title" header="Title" sortable style={{ width: "40%" }} />
        <Column field="destination" header="Destination" sortable style={{ width: "30%" }} />
        <Column field="start_date" header="Start Date" sortable style={{ width: "30%" }} />
      </DataTable>
    </div>
  );
}
