"use client";

import { useEffect, useState } from "react";
import { useUser } from "@context/UserContext";
import { useRouter } from "next/navigation";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

export default function Home() {
  const router = useRouter();
  const { user } = useUser();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  useEffect(() => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const url = globalFilterValue.trim() ? `/api/itineraries` : `/api/itineraries?userId=${user.id}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch itineraries: ${res.status}`);
        }

        const data = await res.json();
        console.log("Fetching itineraries from:", data);
        setList(data);
      } catch (err) {
        console.error(err);
        setList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, globalFilterValue]);

  const onRowClick = (event) => {
    router.push(`/itineraries/${event.data.id}`);
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center">
      <span className="p-input-icon-left">
        <InputText value={globalFilterValue} onChange={(e) => setGlobalFilterValue(e.target.value)} placeholder="Global Search" />
      </span>
      <Button icon="pi pi-plus" label="Add New" onClick={() => router.push("/itineraries/new")} title="Add new itinerary" />
    </div>
  );

  const header = renderHeader();

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">My Itineraries</h1>

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
          globalFilter={globalFilterValue}
          globalFilterFields={["title", "destination", "start_date"]}
          emptyMessage="No itineraries found."
          className="p-datatable-sm"
        >
          <Column field="title" header="Title" sortable style={{ width: "40%" }} />
          <Column field="destination" header="Destination" sortable style={{ width: "30%" }} />
          <Column field="start_date" header="Start Date" sortable style={{ width: "30%" }} />
        </DataTable>
      </div>
    </div>
  );
}
