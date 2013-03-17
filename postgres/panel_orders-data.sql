-- POPULATE panel_orders (default test/lab panel order)
-- TODO: This will be wrong if sections or specialties change!!! Replace later with SELECT and a sequence (for panel_id, order_val)
INSERT INTO panel_orders (sec_id, panel_id, entity_type_id, entity_id, spec_id, order_val, hide) VALUES
     (4, 1, 1, 0, 1, 1, false),    -- Respiratory
     (4, 2, 1, 0, 1, 2, false),    -- Hematology
     (4, 3, 1, 0, 1, 3, false),    -- Glucose
     (4, 4, 1, 0, 1, 4, false),    -- Chem Panel (Ser/Plas/Bld)
     (4, 5, 1, 0, 1, 5, false),    -- Chem: Others
     (4, 6, 1, 0, 1, 6, false),    -- CSF
     (4, 7, 1, 0, 1, 7, false),    -- Coagulation
     (4, 8, 1, 0, 1, 8, false),    -- Gas Panel
     (4, 9, 1, 0, 1, 9, false),    -- Endocrine
     (4, 10, 1, 0, 1, 10, false),  -- Lipids
     (4, 11, 1, 0, 1, 11, false),  -- Liver
     (4, 12, 1, 0, 1, 12, false),  -- Renal
     (4, 13, 1, 0, 1, 13, false),  -- Thyroid
     (4, 14, 1, 0, 1, 14, false);  -- Urine
