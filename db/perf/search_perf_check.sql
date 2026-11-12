-- S2-DBA-06: search performance check (safe to run any time; nothing is kept).
-- Loads 15,000 temporary customers, products and prices, times the standard list/search
-- queries the app uses, then ends with an error on purpose so everything is rolled back.
-- Budget: every query must finish in under 100 ms.
DO $$
DECLARE
    n CONSTANT int := 15000;
    t timestamp; ms numeric; r text := ''; slow int := 0;
    dummy numeric;
BEGIN
    INSERT INTO customer (custno, custname, address, payterm)
    SELECT 'Z' || lpad(to_hex(g), 4, '0'),
           initcap(substr(md5(g::text), 1, 7)) || ' ' || initcap(substr(md5((g*7)::text), 1, 8)),
           substr(md5((g*13)::text), 1, 12) || ' St, ' || (ARRAY['Manila','Quezon City','Makati','Cebu City','Davao'])[1 + g % 5],
           (ARRAY['COD','30D','45D'])[1 + g % 3]
      FROM generate_series(1, n) g;
    INSERT INTO product (prodcode, description, unit)
    SELECT 'Z' || lpad(to_hex(g), 5, '0'),
           'Item ' || initcap(substr(md5(g::text), 1, 9)) || ' ' || substr(md5((g*5)::text), 1, 6),
           (ARRAY['pc','ea','mtr','pkg','ltr'])[1 + g % 5]
      FROM generate_series(1, n) g;
    INSERT INTO pricehist (effdate, prodcode, unitprice)
    SELECT date '2025-01-01' + (g % 3) * 120, 'Z' || lpad(to_hex(g), 5, '0'), 10 + g % 500
      FROM generate_series(1, n) g;
    ANALYZE customer; ANALYZE product; ANALYZE pricehist;

    -- 1 customer search (name or address contains text), sorted, first page
    t := clock_timestamp();
    PERFORM * FROM customer_active WHERE custname ILIKE '%1a2b3c%' OR address ILIKE '%1a2b3c%' ORDER BY lower(custname) LIMIT 20;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('customer search %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    -- 2 customer filter by payment term, sorted, third page
    t := clock_timestamp();
    PERFORM * FROM customer_active WHERE payterm = 'COD' ORDER BY lower(custname) LIMIT 20 OFFSET 40;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('customer filter %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    -- 3 plain customer list, sorted, first page
    t := clock_timestamp();
    PERFORM * FROM customer_active ORDER BY lower(custname) LIMIT 20;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('customer list %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    -- 4 product search, sorted, first page
    t := clock_timestamp();
    PERFORM * FROM product_active WHERE description ILIKE '%c4ca42%' ORDER BY lower(description) LIMIT 20;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('product search %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    -- 5 product filter by unit, sorted, first page
    t := clock_timestamp();
    PERFORM * FROM product_active WHERE unit = 'mtr' ORDER BY lower(description) LIMIT 20;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('product filter %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    -- 6 price of one product on a date
    t := clock_timestamp();
    SELECT price_as_of('Z02710', '2025-09-01') INTO dummy;
    ms := round(extract(epoch FROM clock_timestamp() - t) * 1000, 1);
    r := r || format('price as of %s ms; ', ms); IF ms >= 100 THEN slow := slow + 1; END IF;

    RAISE EXCEPTION 'PERF RESULT (rolled back, % rows each): %slower than 100 ms: % (expected 0)', n, r, slow;
END $$;
