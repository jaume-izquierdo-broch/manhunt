ALTER TABLE "matches" ALTER COLUMN "center_lat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "center_lng" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_center_ck" CHECK ("matches"."status" = 'WAITING' or ("matches"."center_lat" is not null and "matches"."center_lng" is not null));