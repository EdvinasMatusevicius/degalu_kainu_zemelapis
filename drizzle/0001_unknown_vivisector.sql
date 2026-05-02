CREATE TABLE "osm_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"osm_id" bigint NOT NULL,
	"osm_type" varchar(10) NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lon" numeric(10, 7) NOT NULL,
	"name" varchar,
	"brand" varchar,
	"operator" varchar,
	"addr_street" varchar,
	"addr_housenumber" varchar,
	"addr_city" varchar,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "osm_stations_osm_id_osm_type_unique" UNIQUE("osm_id","osm_type")
);
--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "lon" numeric(10, 7);