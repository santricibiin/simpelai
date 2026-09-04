-- Badge promo per produk (mis. "PROMO", "HEMAT 20%"). NULL = tanpa badge.
ALTER TABLE products
  ADD COLUMN promo_badge VARCHAR(30) NULL DEFAULT NULL AFTER price;
