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

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
