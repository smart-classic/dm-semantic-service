--
-- SMART Identity Schema (org_smartplatforms_semantic_diverse)
-- NOTE: Part of the 'diverse' database!
--
\set Version 'ident-20130123'
SET client_encoding = 'UTF-8';

--
-- INITIAL CLEANUP
--
DROP TABLE version;
DROP TABLE facility_types CASCADE;
DROP TABLE organizations CASCADE;
DROP TABLE locations CASCADE;
DROP TABLE groups CASCADE;
DROP TABLE users CASCADE;

--
-- Database version
--
CREATE TABLE version
(
    db_version      VARCHAR NOT NULL,
    created_ts      TIMESTAMP DEFAULT NOW()
);
INSERT INTO version (db_version) VALUES (':Version');

--
-- Facility types
--
CREATE TABLE facility_types
(
	fac_type_id		SERIAL PRIMARY KEY,
	fac_type_name		VARCHAR NOT NULL
);

-- POPULATE
-- (from http://www.state.nj.us/health/healthfacilities/types.shtml)
INSERT INTO facility_types (fac_type_name) VALUES ('UNDEFINED'), ('Ambulatory Care Facility'), ('Ambulatory Surgery Center'), ('Birth Center'),
     ('Hemodialysis Center'), ('Rehabilitation Center'), ('Rehabilitation Hospital'), ('CAT Imaging Center'), ('Drug Abuse Treatment Center'),
     ('Family Planning Center'), ('General Acute Care Hospital'), ('Residential Hospice'), ('MRI Center'), ('PET Imaging Center'), ('Primary Care Facility'),
     ('Psychiatric Hospital');


--
-- Organizations
--
CREATE TABLE organizations
(
	org_id			SERIAL PRIMARY KEY,
	org_name		VARCHAR NOT NULL,
	org_address		VARCHAR
);

-- POPULATE
INSERT INTO organizations (org_name) VALUES ('Smithville Hospital');


--
-- Locations
--
CREATE TABLE locations
(
	loc_id			SERIAL PRIMARY KEY,
	org_id			INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
	fac_type_id		INTEGER NOT NULL REFERENCES facility_types(fac_type_id) ON DELETE CASCADE,
	loc_name		VARCHAR NOT NULL,
	loc_address		VARCHAR
);

-- POPULATE
INSERT INTO locations (org_id, fac_type_id, loc_name)
     SELECT org_id, fac_type_id, 'Main Hospital' FROM organizations, facility_types
      WHERE org_name = 'Smithville Hospital' AND fac_type_name = 'General Acute Care Hospital';


--
-- Groups
--
CREATE TABLE groups
(
	group_id		SERIAL PRIMARY KEY,
	loc_id			INTEGER NOT NULL REFERENCES locations(loc_id) ON DELETE CASCADE,
	org_id			INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
	fac_type_id		INTEGER NOT NULL REFERENCES facility_types(fac_type_id) ON DELETE CASCADE,
	group_name		VARCHAR NOT NULL
);

-- POPULATE
INSERT INTO groups (loc_id, org_id, fac_type_id, group_name)
     SELECT loc_id, locations.org_id, locations.fac_type_id, 'Trauma Center' FROM locations, organizations, facility_types
      WHERE org_name = 'Smithville Hospital' AND fac_type_name = 'General Acute Care Hospital'
        AND organizations.org_id = locations.org_id AND loc_name = 'Main Hospital';

--
-- Users
--
CREATE TABLE users
(
	account_id		VARCHAR NOT NULL UNIQUE,   -- from smart.smart_account -- no fk constraint
	group_id		INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
	loc_id			INTEGER NOT NULL REFERENCES locations(loc_id) ON DELETE CASCADE,
	org_id			INTEGER NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
	fac_type_id		INTEGER NOT NULL REFERENCES facility_types(fac_type_id) ON DELETE CASCADE,
	spec_id			INTEGER NOT NULL,	-- default display value (from diverse -- no fk constraint)
	user_name		VARCHAR
);

-- POPULATE (see diverse-schema.sql due to spec_id)
