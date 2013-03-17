--
-- SMART De-Ident Schema (org_smartplatforms_semantic_de_ident)
--
\set Version '20130114'
SET client_encoding = 'UTF-8';

--
-- INITIAL CLEANUP
--
DROP TABLE version;
DROP TABLE purpose CASCADE;
DROP TABLE operations CASCADE;
DROP TABLE attribute_types CASCADE;
DROP TABLE attributes CASCADE;
DROP TABLE rules CASCADE;
DROP TABLE defaults CASCADE;

--
-- Database version
--
CREATE TABLE version
(
    db_version      VARCHAR NOT NULL,
    created_ts      TIMESTAMP DEFAULT NOW()
);
INSERT INTO version (db_version) VALUES (:Version);

--
-- "Reasons" for performing de-identification.
--
CREATE TABLE purpose
(
	purpose_id		SERIAL PRIMARY KEY,
	purpose_desc		VARCHAR NOT NULL
);

-- CREATE INDEXES
-- CREATE INDEX purpose_desc_idx ON purpose (purpose_desc);

-- POPULATE
INSERT INTO purpose (purpose_desc) VALUES ('publication'), ('aggregation'), ('support'), ('redact_all');


--
--  De-identification operations that can be performed on a datum.
--
CREATE TABLE operations
(
	op_id			SERIAL PRIMARY KEY,
	op_name			VARCHAR NOT NULL
);

-- CREATE INDEXES
-- CREATE INDEX operations_name_idx ON operations (op_name);

-- POPULATE
INSERT INTO operations (op_name) VALUES ('erase'), ('hide'), ('mask'), ('defocus'), ('default');


--
--  All attributes of the same type should be processed by the same operation for a given purpose.
--
CREATE TABLE attribute_types
(
	type_id			SERIAL PRIMARY KEY,
	type_desc		VARCHAR NOT NULL
);

-- CREATE INDEXES
-- CREATE INDEX attribute_types_desc_idx ON attribute_types (type_desc);

-- POPULATE
INSERT INTO attribute_types (type_desc) VALUES ('dob'), ('given_name'), ('family_name'), ('gender');
INSERT INTO attribute_types (type_desc) VALUES ('street_addr'), ('city'), ('state'), ('zip'), ('phone');
INSERT INTO attribute_types (type_desc) VALUES ('email'), ('id'), ('url'), ('unknown');


--
-- The known attributes and their associated attribute types.
--
CREATE TABLE attributes
(
	attr_name		VARCHAR PRIMARY KEY,
	type_id			INTEGER NOT NULL REFERENCES attribute_types(type_id) ON DELETE CASCADE
);

-- CREATE INDEXES
CREATE INDEX attributes_type_id_idx ON attributes (type_id);

-- POPULATE
INSERT INTO attributes SELECT '**unknown**', type_id FROM attribute_types WHERE type_desc = 'unknown';
INSERT INTO attributes SELECT 'bday', type_id FROM attribute_types WHERE type_desc = 'dob';
INSERT INTO attributes SELECT 'familyName', type_id FROM attribute_types WHERE type_desc = 'family_name';
INSERT INTO attributes SELECT 'givenName', type_id FROM attribute_types WHERE type_desc = 'given_name';
INSERT INTO attributes SELECT 'medicalRecordNumber', type_id FROM attribute_types WHERE type_desc = 'id';
INSERT INTO attributes SELECT 'gender', type_id FROM attribute_types WHERE type_desc = 'gender';


--
--  For a given purpose and attribute type, perform a specific operation on that attribute's data.
--
CREATE TABLE rules
(
	purpose_id		INTEGER NOT NULL REFERENCES purpose(purpose_id) ON DELETE CASCADE,
	type_id			INTEGER NOT NULL REFERENCES attribute_types(type_id) ON DELETE CASCADE,
	op_id			INTEGER NOT NULL REFERENCES operations(op_id) ON DELETE CASCADE
);

-- CREATE INDEXES
ALTER TABLE rules ADD CONSTRAINT rules_pkey PRIMARY KEY (purpose_id, type_id);
CREATE INDEX rules_op_id_idx ON rules (op_id);

-- POPULATE
INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'redact_all' AND operations.op_name = 'hide';

INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'support' AND operations.op_name = 'default';

INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'publication' AND operations.op_name = 'hide'
		     AND attribute_types.type_desc IN ('id');
INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'publication' AND operations.op_name = 'mask'
		     AND attribute_types.type_desc IN ('dob', 'gender');
INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'publication' AND operations.op_name = 'default'
		     AND attribute_types.type_desc IN ('given_name', 'family_name', 'street_addr', 'city', 'state', 'zip',
						       'phone', 'email', 'url');

INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'aggregation' AND operations.op_name = 'hide'
		     AND attribute_types.type_desc IN ('given_name', 'family_name', 'street_addr', 'city', 'phone', 'email', 'url');
INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'aggregation' AND operations.op_name = 'mask'
		     AND attribute_types.type_desc IN ('id');
INSERT INTO rules SELECT purpose.purpose_id, attribute_types.type_id, operations.op_id FROM purpose, attribute_types, operations
		   WHERE purpose.purpose_desc = 'aggregation' AND operations.op_name = 'defocus'
		     AND attribute_types.type_desc IN ('dob', 'zip');


--
--  Values to use for the default operation.
--
CREATE TABLE defaults
(
	type_id			INTEGER PRIMARY KEY REFERENCES attribute_types(type_id) ON DELETE CASCADE,
	value			VARCHAR NOT NULL
);

-- POPULATE
INSERT INTO defaults SELECT type_id, 'J' FROM attribute_types WHERE type_desc = 'given_name';
INSERT INTO defaults SELECT type_id, 'Doe' FROM attribute_types WHERE type_desc = 'family_name';
INSERT INTO defaults SELECT type_id, '123 Any Street' FROM attribute_types WHERE type_desc = 'street_addr';
INSERT INTO defaults SELECT type_id, 'Anytown' FROM attribute_types WHERE type_desc = 'city';
INSERT INTO defaults SELECT type_id, '99999' FROM attribute_types WHERE type_desc = 'zip';
INSERT INTO defaults SELECT type_id, '555-555-5555' FROM attribute_types WHERE type_desc = 'phone';
INSERT INTO defaults SELECT type_id, 'jdoe@example.com' FROM attribute_types WHERE type_desc = 'email';
INSERT INTO defaults SELECT type_id, '000-00-0000' FROM attribute_types WHERE type_desc = 'id';
INSERT INTO defaults SELECT type_id, 'http://www.example.com' FROM attribute_types WHERE type_desc = 'url';
