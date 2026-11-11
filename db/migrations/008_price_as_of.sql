-- S2-DBA-02: "what was the price on this date?"
-- Price on a date = the unit price with the latest effective date on or before it
-- (soft-deleted price rows are ignored). NULL when no price existed yet.

-- Fast lookup: newest price at or before a date, per product
CREATE INDEX pricehist_prod_eff_idx ON pricehist (prodcode, effdate DESC) WHERE NOT is_deleted;

-- Price of one product on a date (default: today)
CREATE FUNCTION price_as_of(p_prodcode VARCHAR, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2)
LANGUAGE sql STABLE AS $$
    SELECT unitprice
      FROM pricehist
     WHERE prodcode = p_prodcode AND NOT is_deleted AND effdate <= p_date
     ORDER BY effdate DESC
     LIMIT 1
$$;

-- Every active product with its price on a date (unitprice is NULL if none yet)
CREATE FUNCTION products_priced_as_of(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (prodcode VARCHAR, description VARCHAR, unit VARCHAR, unitprice DECIMAL(10,2), effdate DATE)
LANGUAGE sql STABLE AS $$
    SELECT p.prodcode, p.description, p.unit, ph.unitprice, ph.effdate
      FROM product_active p
      LEFT JOIN LATERAL (
            SELECT h.unitprice, h.effdate
              FROM pricehist h
             WHERE h.prodcode = p.prodcode AND NOT h.is_deleted AND h.effdate <= p_date
             ORDER BY h.effdate DESC
             LIMIT 1
      ) ph ON TRUE
     ORDER BY p.prodcode
$$;
