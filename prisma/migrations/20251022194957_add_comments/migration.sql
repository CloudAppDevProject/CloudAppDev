-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "itinerary_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
