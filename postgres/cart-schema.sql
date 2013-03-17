--
-- SMART Cart Schema (org_smartplatforms_semantic_cart)
--
\set Version '20130222'
SET client_encoding = 'UTF-8';

--
-- INITIAL CLEANUP
--
DROP TABLE version;
DROP TABLE categories CASCADE;         -- temporary (table moved to diverse db)
DROP TABLE actions CASCADE;
DROP TABLE section_actions CASCADE;
DROP TABLE cart_items CASCADE;

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
-- Cart actions
--
CREATE TABLE actions
(
	act_id			SERIAL PRIMARY KEY,
	act_name		VARCHAR NOT NULL,
	act_desc		VARCHAR
);

-- POPULATE
INSERT INTO actions (act_name) VALUES ('Discontinue'), ('Adjust'), ('Add'), ('Hypothesize'), ('Annotate'), ('Affirm'), ('Fix'), ('Resolve');


--
-- Supported actions for sections
--
CREATE TABLE section_actions
(
	sec_name		VARCHAR NOT NULL,    -- from diverse db
	act_name		VARCHAR NOT NULL,
	priority        INTEGER NOT NULL     -- relative priority of this action (for use by scribes): 1 up to 100
);

-- POPULATE
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Meds', 'Discontinue', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Meds', 'Adjust', 80);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Meds', 'Add', 80);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Meds', 'Fix', 50);

INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Problems', 'Add', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Problems', 'Annotate', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Problems', 'Affirm', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Problems', 'Fix', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Problems', 'Resolve', 50);

INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Allergies', 'Add', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Allergies', 'Annotate', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Allergies', 'Affirm', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Allergies', 'Fix', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Allergies', 'Resolve', 50);

INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Tests', 'Adjust', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Tests', 'Add', 80);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Tests', 'Fix', 50);

INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Exams', 'Annotate', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Exams', 'Fix', 50);

INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Notes', 'Add', 50);
INSERT INTO section_actions (sec_name, act_name, priority) VALUES ('Notes', 'Fix', 50);


--
-- Cart contents
--
CREATE TABLE cart_items
(
	item_id			SERIAL PRIMARY KEY,
	sec_name		VARCHAR,             -- from diverse db
	act_id			INTEGER NOT NULL REFERENCES actions(act_id) ON DELETE CASCADE,
	text			VARCHAR,
	patient			VARCHAR NOT NULL,
	hypothetical    BOOLEAN DEFAULT FALSE,
	app_item_id     VARCHAR NOT NULL,   -- allows the app to tie this item to a UI element (note: cross-user!!)
	created_by		VARCHAR NOT NULL,	-- from smart.smart_account.account_id
	created_ts      TIMESTAMP,
	edited_by       VARCHAR,		    -- from smart.smart_account.account_id
	edited_ts       TIMESTAMP,
	committed		BOOLEAN DEFAULT FALSE,
	committed_by    VARCHAR,		    -- from smart.smart_account.account_id
	committed_ts	TIMESTAMP,
	deleted         BOOLEAN DEFAULT FALSE,
	deleted_by      VARCHAR,		    -- from smart.smart_account.account_id
	deleted_ts      TIMESTAMP,
	processed		BOOLEAN DEFAULT FALSE,
	processed_by	VARCHAR,		    -- from smart.smart_account.account_id
	processed_ts	TIMESTAMP
);

-- CREATE INDEXES
CREATE INDEX cart_items_patient_idx ON cart_items(patient);
CREATE INDEX cart_items_created_by_idx ON cart_items(created_by);
CREATE INDEX cart_items_committed_idx ON cart_items(committed);
CREATE INDEX cart_items_processed_idx ON cart_items(processed);
