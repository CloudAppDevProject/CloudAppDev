-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "itinerary_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "short_desc" TEXT,
    "images" VARCHAR(500)[],

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
