--
-- SMART Disease Diversity Schema (org_smartplatforms_semantic_diverse)
-- NOTE: Execute ident-schema.sql FIRST!
--
\set Version 'diverse-20130320'
SET client_encoding = 'UTF-8';

--
-- INITIAL CLEANUP
--
DROP TABLE sections CASCADE;
DROP TABLE panels CASCADE;
DROP TABLE specialties CASCADE;
DROP TABLE tests_problems CASCADE;
DROP TABLE entity_types CASCADE;
DROP TABLE section_priorities CASCADE;
DROP TABLE panel_priorities CASCADE;
DROP TABLE test_priorities CASCADE;

DROP TABLE section_orders CASCADE;
DROP TABLE panel_orders CASCADE;
DROP TABLE test_orders CASCADE;

--
-- Database version (table created by ident-schema.sql)
--
INSERT INTO version (db_version) VALUES (':Version');

--
-- Sections
--
CREATE TABLE sections
(
	sec_id			SERIAL PRIMARY KEY,
	sec_name		VARCHAR NOT NULL,
	sec_desc		VARCHAR
);

-- POPULATE
INSERT INTO sections (sec_name) VALUES ('Meds'), ('Problems'), ('Allergies'), ('Tests'), ('Exams'), ('Notes'), ('Vitals'),
    ('Immunizations'), ('OtherInfo'), ('Graphs');


--
-- Panels
--
CREATE TABLE panels
(
	panel_id		SERIAL PRIMARY KEY,
	panel_name		VARCHAR NOT NULL,
	sec_id          INTEGER NOT NULL REFERENCES sections(sec_id) ON DELETE CASCADE,  -- parent section
	graphable       BOOLEAN NOT NULL,
	created_by		VARCHAR NOT NULL,	-- from smart.smart-account.account_id -- no fk constraint
	created_ts		TIMESTAMP DEFAULT NOW()
);


--
-- Specialties
--
CREATE TABLE specialties
(
	spec_id			SERIAL PRIMARY KEY,
	spec_name		VARCHAR NOT NULL,
	created_by		VARCHAR NOT NULL,	-- from smart.smart-account.account_id -- no fk constraint
	created_ts		TIMESTAMP DEFAULT NOW()
);

-- POPULATE
INSERT INTO specialties (spec_name, created_by) VALUES ('NONE', 0), ('Allergy and Immunology', 0), ('Anesthesia', 0), ('Cardiology', 0), ('Dentistry', 0),
     ('Dermatology', 0), ('Emergency Medicine', 0), ('Endocrinology and Metabolism', 0), ('Family Practice', 0), ('Gastroenterology', 0),
     ('General Practice', 0), ('Geriatric Medicine', 0), ('Gynecology', 0), ('Gynecologic Oncology', 0), ('Hematology', 0), ('Infectious Diseases', 0),
     ('Internal Medicine', 0), ('Neonatology', 0), ('Nephrology', 0), ('Neurology', 0), ('Neurological Surgery', 0), ('Obstetrics and Gynecology', 0),
     ('Oncology, Medical', 0), ('Ophthalmology', 0), ('Orthopedic Surgery', 0), ('Otorhinolaryngology', 0), ('Pathology', 0), ('Pediatrics', 0),
     ('Physical Medicine and Rehabilitation', 0), ('Plastic Surgery', 0), ('Podiatry', 0), ('Preventive Medicine', 0), ('Psychiatry', 0),
     ('Pulmonary Disease', 0), ('Radiology, Diagnostic', 0), ('Radiology, Nuclear', 0), ('Radiation Oncology', 0), ('Rheumatology', 0),
     ('Sports Medicine', 0), ('Surgery, General', 0), ('Surgery, Hand', 0), ('Surgery, Thoracic', 0), ('Surgery, Vascular', 0),
     ('Surgery, Colon and Rectal', 0), ('Surgery, Urology', 0);


--
-- Tests for problems (and specialty, facility_type)
--
CREATE TABLE tests_problems
(
	tp_id			SERIAL PRIMARY KEY,
	loinc_num		VARCHAR NOT NULL,	-- test (from problems_meds -- no fk constraint)
	snomed_cid		VARCHAR NOT NULL,	-- problem (from problems_meds -- no fk constraint)
	flag            VARCHAR,            -- 'H' if high test value indicates problem, 'L' if low test value, else any
	panel_id		INTEGER NOT NULL REFERENCES panels(panel_id) ON DELETE CASCADE,
	spec_id			INTEGER NOT NULL REFERENCES specialties(spec_id) ON DELETE CASCADE,
	fac_type_id		INTEGER NOT NULL REFERENCES facility_types(fac_type_id) ON DELETE CASCADE,
	created_by		VARCHAR NOT NULL,	-- from smart.smart-account.account_id -- no fk constraint
	created_ts		TIMESTAMP DEFAULT NOW()
);


--
-- Entity Types
--
CREATE TABLE entity_types
(
	entity_type_id		    SERIAL PRIMARY KEY,
	entity_type_name	    VARCHAR NOT NULL,
	entity_type_order_base  INTEGER NOT NULL
);

-- POPULATE
INSERT INTO entity_types (entity_type_name, entity_type_order_base) VALUES
     ('seed', 5000), ('community', 4000), ('organization', 3000), ('location', 2000), ('group', 1000), ('user', 0);

--
-- Section Orders
--
CREATE TABLE section_orders
(
	s_ord_id		SERIAL PRIMARY KEY,	-- NEED THIS???
	sec_id		    INTEGER NOT NULL REFERENCES sections(sec_id) ON DELETE CASCADE,
	entity_type_id	INTEGER NOT NULL REFERENCES entity_types(entity_type_id) ON DELETE CASCADE,
	entity_id		VARCHAR NOT NULL,	-- based on entity_type_id -- no fk constraint
	spec_id			INTEGER NOT NULL REFERENCES specialties(spec_id) ON DELETE CASCADE,
	num_cols        INTEGER NOT NULL,   -- how many columns in this display?
	sec_col         INTEGER NOT NULL,   -- which column is this section in?
	order_val	    INTEGER NOT NULL,   -- where in the column is this section?
	hide			BOOLEAN DEFAULT FALSE
);

-- POPULATE (default section order)
-- TODO: This will be wrong if sections or specialties change!!! Replace later with SELECT and a sequence (for order_val)
INSERT INTO section_orders (sec_id, entity_type_id, entity_id, spec_id, num_cols, sec_col, order_val, hide) VALUES
        -- Column 1
        (2, 1, 0, 1, 3, 1, 5001, false),  -- Problems
        (7, 1, 0, 1, 3, 1, 5002, false),  -- Vitals
        (9, 1, 0, 1, 3, 1, 5003, false),  -- Other Info
        -- Column 2
        (1, 1, 0, 1, 3, 2, 5001, false),  -- Meds
        (3, 1, 0, 1, 3, 2, 5002, false),  -- Allergies
        -- Column 3
        (10, 1, 0, 1, 3, 3, 5001, false), -- Graphs
        (4, 1, 0, 1, 3, 3, 5002, false),  -- Tests
        -- Hidden
        (5, 1, 0, 1, 3, 3, 5003, true),   -- Exams
        (6, 1, 0, 1, 3, 3, 5004, true),   -- Notes
        (8, 1, 0, 1, 3, 3, 5005, true);   -- Immunizations

--
-- Panel Orders
-- Note: sec_id is used for panel_orders rather than each panel's sec_id
--
CREATE TABLE panel_orders
(
	p_ord_id		SERIAL PRIMARY KEY,	-- NEED THIS???
	sec_id          INTEGER NOT NULL REFERENCES sections(sec_id) ON DELETE CASCADE,
	panel_id		INTEGER NOT NULL REFERENCES panels(panel_id) ON DELETE CASCADE,
	entity_type_id	INTEGER NOT NULL REFERENCES entity_types(entity_type_id) ON DELETE CASCADE,
	entity_id		VARCHAR NOT NULL,	-- based on entity_type_id -- no fk constraint
	spec_id			INTEGER NOT NULL REFERENCES specialties(spec_id) ON DELETE CASCADE,
--	snomed_cid		VARCHAR NOT NULL,	-- problem (from problems_meds -- no fk constraint)
	order_val	    INTEGER NOT NULL,
	hide			BOOLEAN DEFAULT FALSE
);

--POPULATE (see 'panel_orders-data.sql')

--
-- Test Orders
--
CREATE TABLE test_orders
(
    t_ord_id		SERIAL PRIMARY KEY,	-- NEED THIS???
    panel_id        INTEGER NOT NULL REFERENCES panels(panel_id) ON DELETE CASCADE,
    tp_id			INTEGER NOT NULL REFERENCES tests_problems(tp_id) ON DELETE CASCADE,
    entity_type_id	INTEGER NOT NULL REFERENCES entity_types(entity_type_id) ON DELETE CASCADE,
    entity_id		VARCHAR NOT NULL,	-- based on entity_type_id -- no fk constraint
	spec_id			INTEGER NOT NULL REFERENCES specialties(spec_id) ON DELETE CASCADE,
    order_val	    INTEGER NOT NULL,
    hide			BOOLEAN DEFAULT FALSE
);


-- POPULATE users (from ident-schema.sql due to spec_id)
INSERT INTO users (account_id, group_id, loc_id, org_id, fac_type_id, spec_id, user_name)
     SELECT '1234', group_id, groups.loc_id, groups.org_id, groups.fac_type_id, spec_id, 'Dr. Jane Smith'
       FROM groups, locations, organizations, facility_types, specialties
      WHERE org_name = 'Smithville Hospital' AND fac_type_name = 'General Acute Care Hospital'
        AND organizations.org_id = locations.org_id AND loc_name = 'Main Hospital'
        AND locations.loc_id = groups.loc_id AND group_name = 'Trauma Center'
        AND spec_name = 'Emergency Medicine';