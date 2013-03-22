-- POPULATE panel_orders (default test/lab panel order)
-- TODO: This will be wrong if sections or specialties change!!! Replace later with SELECT and a sequence (for panel_id, order_val)
INSERT INTO panel_orders (sec_id, panel_id, entity_type_id, entity_id, spec_id, order_val, hide) VALUES
     (4, 1, 1, 0, 1, 5001, false),   -- Respiratory
     (4, 2, 1, 0, 1, 5002, false),   -- Hematology
     (4, 3, 1, 0, 1, 5003, false),   -- Glucose
     (4, 4, 1, 0, 1, 5004, false),   -- Chem Panel (Ser/Plas/Bld)
     (4, 5, 1, 0, 1, 5005, false),   -- Chem: Others
     (4, 6, 1, 0, 1, 5006, false),   -- CSF
     (4, 7, 1, 0, 1, 5007, false),   -- Coagulation
     (4, 8, 1, 0, 1, 5008, false),   -- Gas Panel
     (4, 9, 1, 0, 1, 5009, false),   -- Endocrine
     (4, 10, 1, 0, 1, 5010, false),  -- Lipids
     (4, 11, 1, 0, 1, 5011, false),  -- Liver
     (4, 12, 1, 0, 1, 5012, false),  -- Renal
     (4, 13, 1, 0, 1, 5013, false),  -- Thyroid
     (4, 14, 1, 0, 1, 5014, false);  -- Urine
