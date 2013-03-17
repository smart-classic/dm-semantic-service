--
-- SMART Problems-Meds Schema (org_smartplatforms_semantic_diverse)
--
\set Version '20130304'
SET client_encoding = 'UTF-8';

--
-- INITIAL CLEANUP
--
DROP TABLE version;
DROP TABLE LOINC CASCADE;
DROP TABLE Loinc_hierarchy CASCADE;
DROP TABLE SNOMEDCT_CORE_SUBSET_201208 CASCADE;
DROP TABLE RXTERMS CASCADE;
DROP TABLE problems_meds_sources CASCADE;
DROP TABLE problems_meds CASCADE;
DROP TABLE test_constraints CASCADE;
DROP TABLE test_ranges CASCADE;
DROP TABLE loinc_extra CASCADE;

--
-- Database version
--
CREATE TABLE version
(
    db_version      VARCHAR NOT NULL,
    created_ts      TIMESTAMP DEFAULT NOW()
);
INSERT INTO version (db_version) VALUES (:Version);

-- ----------------------------------------------------------
-- MDB Tools - A library for reading MS Access database files
-- Copyright (C) 2000-2011 Brian Bruns and others.
-- Files in libmdb are licensed under LGPL and the utilities under
-- the GPL, see COPYING.LIB and COPYING files respectively.
-- Check out http://mdbtools.sourceforge.net
-- ----------------------------------------------------------

CREATE TABLE LOINC
 (
	LOINC_NUM		VARCHAR (20) NOT NULL, 
	COMPONENT		VARCHAR (510) NOT NULL, 
	PROPERTY		VARCHAR (60), 
	TIME_ASPCT		VARCHAR (30), 
	SYSTEM			VARCHAR (200), 
	SCALE_TYP		VARCHAR (60), 
	METHOD_TYP		VARCHAR (100), 
	CLASS			VARCHAR (40), 
	SOURCE			VARCHAR (16), 
	DATE_LAST_CHANGED	TIMESTAMP WITHOUT TIME ZONE, 
	CHNG_TYPE		VARCHAR (6), 
	COMMENTS		TEXT, 
	STATUS			VARCHAR (22) NOT NULL, 
	MAP_TO			VARCHAR (20), 
	CONSUMER_NAME		VARCHAR (510), 
	MOLAR_MASS		VARCHAR (26), 
	CLASSTYPE		INTEGER NOT NULL, 
	FORMULA			VARCHAR (510), 
	SPECIES			VARCHAR (40), 
	EXMPL_ANSWERS		TEXT, 
	ACSSYM			TEXT, 
	BASE_NAME		VARCHAR (100), 
	NAACCR_ID		VARCHAR (40), 
	CODE_TABLE		VARCHAR (20), 
	SURVEY_QUEST_TEXT	TEXT, 
	SURVEY_QUEST_SRC	VARCHAR (100), 
	UNITSREQUIRED		VARCHAR (2), 
	SUBMITTED_UNITS		VARCHAR (60), 
	RELATEDNAMES2		TEXT, 
	SHORTNAME		VARCHAR (80), 
	ORDER_OBS		VARCHAR (30), 
	CDISC_COMMON_TESTS	VARCHAR (2), 
	HL7_FIELD_SUBFIELD_ID	VARCHAR (100), 
	EXTERNAL_COPYRIGHT_NOTICE	TEXT, 
	EXAMPLE_UNITS		VARCHAR (510), 
	LONG_COMMON_NAME	VARCHAR (510), 
	HL7_V2_DATATYPE		VARCHAR (510), 
	HL7_V3_DATATYPE		VARCHAR (510), 
	CURATED_RANGE_AND_UNITS	TEXT, 
	DOCUMENT_SECTION	VARCHAR (510), 
	EXAMPLE_UCUM_UNITS	VARCHAR (510), 
	EXAMPLE_SI_UCUM_UNITS	VARCHAR (510), 
	STATUS_REASON		VARCHAR (18), 
	STATUS_TEXT		TEXT, 
	CHANGE_REASON_PUBLIC	TEXT, 
	COMMON_TEST_RANK	INTEGER NOT NULL, 
	COMMON_ORDER_RANK	INTEGER NOT NULL, 
	COMMON_SI_TEST_RANK	INTEGER NOT NULL
);
COMMENT ON COLUMN LOINC.LOINC_NUM IS 'Unique LOINC number - primary key';
COMMENT ON COLUMN LOINC.COMPONENT IS 'COMPONENT field - first major axis';
COMMENT ON COLUMN LOINC.PROPERTY IS 'PROPERTY field - second major axis';
COMMENT ON COLUMN LOINC.TIME_ASPCT IS 'TIME ASPECT - third major axis';
COMMENT ON COLUMN LOINC.SYSTEM IS 'SYSTEM - specimen - fourth major axis';
COMMENT ON COLUMN LOINC.SCALE_TYP IS 'SCALE - fifth major axis';
COMMENT ON COLUMN LOINC.METHOD_TYP IS 'METHOD - sixth major axis';
COMMENT ON COLUMN LOINC.CLASS IS 'CLASS - classification of LOINC term';
COMMENT ON COLUMN LOINC.SOURCE IS 'Where the term originated - usually the name of an organization or agency that submitted the term';
COMMENT ON COLUMN LOINC.STATUS IS 'ACTIVE = Use at will; TRIAL = Caution, may change; DISCOURAGED = No new mappings; DEPRECATED = Should not be used';
COMMENT ON COLUMN LOINC.MAP_TO IS 'Contains the LOINC code to be used as a replacement for DEPRECATED terms.  Otherwise, it contains NULL.';
COMMENT ON COLUMN LOINC.CONSUMER_NAME IS 'A patient (consumer) friendly name for this item.';
COMMENT ON COLUMN LOINC.CLASSTYPE IS '1=Laboratory, 2=Clinical, 3=Claims Attachment, 4=Surveys';
COMMENT ON COLUMN LOINC.FORMULA IS 'Contains the formula in human readable form, for calculating the value of any measure that is based on an algebraic or other formula except those for which the component expresses the formula. So Sodium/creatinine does not need a formula, but Free T3 inde';
COMMENT ON COLUMN LOINC.SURVEY_QUEST_TEXT IS 'Contains exact text from survey questions';
COMMENT ON COLUMN LOINC.SURVEY_QUEST_SRC IS 'Represents the source term code of the specific survey instrument.\015\012\015\012';
COMMENT ON COLUMN LOINC.UNITSREQUIRED IS 'Y/N field that indicates that units are required when this LOINC is included as an OBX segment in a HIPAA attachment';
COMMENT ON COLUMN LOINC.SUBMITTED_UNITS IS 'Units as received from person who requested this LOINC term';
COMMENT ON COLUMN LOINC.RELATEDNAMES2 IS 'New version of the relatednames field. This one is populated from the CoreConcepts and Synonyms table.';
COMMENT ON COLUMN LOINC.SHORTNAME IS 'Short name assigned to this LOINC code';
COMMENT ON COLUMN LOINC.ORDER_OBS IS 'A categorical variable with answers that are foreign keys into the ORDER_OBS_CODES table.';
COMMENT ON COLUMN LOINC.CDISC_COMMON_TESTS IS 'CDISC Pharma tests';
COMMENT ON COLUMN LOINC.HL7_FIELD_SUBFIELD_ID IS 'A value in this field means that the content should be delivered in the named field/subfield of the HL7 message. When NULL, the data for this data element should be sent in an OBX Seg. with this LOINC code stored in OBX-3 and with the value in the OBX-5.';
COMMENT ON COLUMN LOINC.EXTERNAL_COPYRIGHT_NOTICE IS 'LOINC includes some content obtained with permission for external sources with their own copyright. When a LOINC observation or panel comes from such a source , we record their copyright notice here.';
COMMENT ON COLUMN LOINC.HL7_V2_DATATYPE IS 'HL7 version 2.x data type that is compatible with this LOINC code';
COMMENT ON COLUMN LOINC.HL7_V3_DATATYPE IS 'HL7 version 3.0 data type that is compatible with this LOINC code';
COMMENT ON COLUMN LOINC.CURATED_RANGE_AND_UNITS IS 'Delimited list of example reference ranges for this LOINC.';
COMMENT ON COLUMN LOINC.DOCUMENT_SECTION IS 'Classification of whether this LOINC code can be used a full document, a section of a document, or both. This field was created in the context of HL7 CDA messaging, and populated in collaboration with the HL7 Structured Documents Technical Committee.';
COMMENT ON COLUMN LOINC.EXAMPLE_UCUM_UNITS IS 'Example UCUM units.';
COMMENT ON COLUMN LOINC.EXAMPLE_SI_UCUM_UNITS IS 'Example SI UCUM units.';
COMMENT ON COLUMN LOINC.STATUS_REASON IS 'Gives the reason a term was deprecated, if known.  Otherwise, it contains NULL.';
COMMENT ON COLUMN LOINC.STATUS_TEXT IS 'Optional.  Free text reason for the current STATUS.';
COMMENT ON COLUMN LOINC.CHANGE_REASON_PUBLIC IS 'Detailed explanation about special changes to the term over time.';
COMMENT ON COLUMN LOINC.COMMON_TEST_RANK IS 'Ranking of approximately 2000 common tests performed by hospitals. The numbers come from Dr. McDonalds work at the NLM';
COMMENT ON COLUMN LOINC.COMMON_ORDER_RANK IS 'Ranking of approximately 300 common orders performed by hospitals.  The numbers come from Dr. McDonalds work at the NLM';
COMMENT ON COLUMN LOINC.COMMON_SI_TEST_RANK IS 'Ranking of approximately 2000 substance based common tests performed by hospitals. The numbers come from Dr. McDonalds work at the NLM';
COMMENT ON TABLE LOINC IS 'LOINC Repository';

-- CREATE INDEXES ...
ALTER TABLE LOINC ADD CONSTRAINT LOINC_pkey PRIMARY KEY (LOINC_NUM);

CREATE TABLE Loinc_hierarchy
 (
	PATH_TO_ROOT		VARCHAR (510), 
	SEQUENCE		INTEGER, 
	IMMEDIATE_PARENT	VARCHAR (510), 
	CODE			VARCHAR (510) NOT NULL, 
	CODE_TEXT		VARCHAR (510)
);

-- CREATE INDEXES ...
CREATE INDEX Loinc_hierarchy_CODE_idx ON Loinc_hierarchy (CODE);
CREATE INDEX Loinc_hierarchy_CODE_TEXT_idx ON Loinc_hierarchy (CODE_TEXT);

CREATE TABLE SNOMEDCT_CORE_SUBSET_201208
 (
	SNOMED_CID		VARCHAR (510), 
	SNOMED_FSN		VARCHAR (510), 
	SNOMED_CONCEPT_STATUS	VARCHAR (510), 
	UMLS_CUI		VARCHAR (510), 
	OCCURRENCE		INTEGER, 
	USAGE			VARCHAR (510), 
	FIRST_IN_SUBSET		VARCHAR (510), 
	IS_RETIRED_FROM_SUBSET	VARCHAR (510), 
	LAST_IN_SUBSET		VARCHAR (510), 
	REPLACED_BY_SNOMED_CID	VARCHAR (510)
);

-- CREATE INDEXES ...
CREATE INDEX SNOMEDCT_CORE_SUBSET_201208_REPLACED_BY_SNOMED_CID_idx ON SNOMEDCT_CORE_SUBSET_201208 (REPLACED_BY_SNOMED_CID);
ALTER TABLE SNOMEDCT_CORE_SUBSET_201208 ADD CONSTRAINT SNOMEDCT_CORE_SUBSET_201208_pkey PRIMARY KEY (SNOMED_CID);

CREATE TABLE RXTERMS
 (
	RXCUI			VARCHAR (16) NOT NULL, 
	GENERIC_RXCUI		VARCHAR (16), 
	TTY			VARCHAR (40), 
	FULL_NAME		TEXT, 
	RXN_DOSE_FORM		VARCHAR (200), 
	FULL_GENERIC_NAME	TEXT, 
	BRAND_NAME		TEXT, 
	DISPLAY_NAME		TEXT, 
	ROUTE			VARCHAR (200), 
	NEW_DOSE_FORM		VARCHAR (200), 
	STRENGTH		TEXT, 
	SUPPRESS_FOR		VARCHAR (60), 
	DISPLAY_NAME_SYNONYM	TEXT, 
	IS_RETIRED		VARCHAR (16), 
	SXDG_RXCUI		VARCHAR (16), 
	SXDG_TTY		VARCHAR (40), 
	SXDG_NAME		VARCHAR (100)
);

-- CREATE INDEXES ...
ALTER TABLE RXTERMS ADD CONSTRAINT RXTERMS_pkey PRIMARY KEY (RXCUI);


CREATE TABLE problems_meds_sources
(
    source_id       SERIAL PRIMARY KEY,
    source_desc     VARCHAR NOT NULL,
    source_ref      VARCHAR
);


CREATE TABLE problems_meds
(
	RXCUI			VARCHAR (16) NOT NULL,   -- should be: REFERENCES RXTERMS(RXCUI) ON DELETE CASCADE,
	CID			    VARCHAR (510) NOT NULL,  -- should be: REFERENCES SNOMEDCT_CORE_SUBSET_201208(SNOMED_CID) ON DELETE CASCADE,
	source_id       INTEGER DEFAULT 0        -- default simplifies importing external datasets
);

-- CREATE INDEXES (actually done in setup-problems_meds.sh to for performance)
--ALTER TABLE Problems_Meds ADD CONSTRAINT Problems_Meds_pkey PRIMARY KEY (CID, RXCUI, source_id);
--CREATE INDEX problems_meds_source_id_idx ON problems_meds(source_id);


--
-- Test Ranges
--
CREATE TABLE test_ranges
(
    tr_id           SERIAL PRIMARY KEY,
    loinc_num       VARCHAR (20) NOT NULL REFERENCES loinc(loinc_num) ON DELETE CASCADE,
    gender          CHAR (1) NOT NULL,
    min_age         REAL NOT NULL,
    max_age         REAL NOT NULL,
    low_val         VARCHAR NOT NULL,
    high_val        VARCHAR NOT NULL,
    units           VARCHAR NOT NULL
);

--
-- LOINC Extra
--
CREATE TABLE loinc_extra
(
    loinc_num       VARCHAR (20) PRIMARY KEY REFERENCES loinc(loinc_num) ON DELETE CASCADE,
    preferred_name  VARCHAR NOT NULL,
	created_by		VARCHAR NOT NULL,	-- from smart.smart-account.account_id -- no fk constraint
	created_ts		TIMESTAMP DEFAULT NOW()
);

