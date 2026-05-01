CREATE TABLE "fuel_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_date" date NOT NULL,
	"station_id" integer NOT NULL,
	"price_95" numeric(6, 3),
	"price_diesel" numeric(6, 3),
	"price_lpg" numeric(6, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_prices_price_date_station_id_unique" UNIQUE("price_date","station_id")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" varchar NOT NULL,
	"municipality" varchar NOT NULL,
	"address" varchar NOT NULL,
	CONSTRAINT "stations_brand_address_unique" UNIQUE("brand","address")
);
--> statement-breakpoint
ALTER TABLE "fuel_prices" ADD CONSTRAINT "fuel_prices_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fuel_prices_price_date_index" ON "fuel_prices" USING btree ("price_date");