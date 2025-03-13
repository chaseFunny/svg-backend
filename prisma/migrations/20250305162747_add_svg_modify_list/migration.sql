-- AlterTable
ALTER TABLE "svg_versions" ADD COLUMN     "last_edited_at" TIMESTAMP(3),
ADD COLUMN     "last_edited_by" INTEGER,
ADD COLUMN     "svg_modify_list" JSONB;
