-- CreateTable
CREATE TABLE "Itinerary" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "short_desc" TEXT,
    "detail_desc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "itinerary_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "short_desc" TEXT,
    "images" VARCHAR(500)[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Itinerary_user_id_idx" ON "Itinerary"("user_id");

-- CreateIndex
CREATE INDEX "Itinerary_destination_idx" ON "Itinerary"("destination");

-- CreateIndex
CREATE INDEX "Itinerary_created_at_idx" ON "Itinerary"("created_at");

-- CreateIndex
CREATE INDEX "Location_itinerary_id_idx" ON "Location"("itinerary_id");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
