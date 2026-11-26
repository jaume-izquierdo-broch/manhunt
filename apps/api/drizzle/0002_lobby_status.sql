ALTER TABLE "matches" DROP CONSTRAINT "matches_status_ck";--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_center_ck";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'LOBBY';--> statement-breakpoint
UPDATE "matches" SET "status" = 'LOBBY' WHERE "status" = 'WAITING';--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_status_ck" CHECK ("matches"."status" in ('LOBBY','HIDING','ACTIVE','FINISHED'));--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_center_ck" CHECK ("matches"."status" = 'LOBBY' or ("matches"."center_lat" is not null and "matches"."center_lng" is not null));