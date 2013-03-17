# Create/setup the "problems_meds" semantic services postgres databases
# v.20130304

# Check arguments
if [[ "$1" != "prod" && "$1" != "stage" && "$1" != "dev" ]]; then
    echo "Usage: $0 {prod|stage|dev}"
    exit 1
fi

# Build database name
if [ "$1" == "prod" ]; then
    DB=org_smartplatforms_semantic_diverse
else
    DB=org_smartplatforms_semantic_diverse_$1
fi

# Create database if necessary
SQL="SELECT 1 FROM pg_database WHERE datname = '$DB'"
if [ -n "$(psql -c "$SQL" | grep rows)" ]; then
    createdb $DB
else
    echo Database \"$DB\" exists.
fi

# Add schema/data
cd $(dirname $0)
echo '========== problems_meds ==========' $(date)
echo '---------- problems_meds-schema.sql ----------'
cat problems_meds-schema.sql | psql -d $DB
echo '---------- loinc-data.sql ----------' $(date)
cat loinc-data.sql | psql -d $DB
echo '---------- loinc_hierarchy-data.sql ----------' $(date)
cat loinc_hierarchy-data.sql | psql -d $DB
echo '---------- rxterms-data.sql ----------' $(date)
cat rxterms-data.sql | psql -d $DB
echo '---------- snomedct_core_subset_201208-data.sql ----------' $(date)
cat snomedct_core_subset_201208-data.sql | psql -d $DB
echo '---------- problems_meds-data.sql ----------' $(date)
cat problems_meds-data.sql | psql -d $DB
echo '---------- NDFRT ----------' $(date)
###cat ndfrt-ontology-full.csv | psql -d $DB -c 'COPY problems_meds (RXCUI, CID) FROM STDIN WITH CSV;'
###psql -d $DB -c "INSERT INTO problems_meds_sources (source_desc, source_ref) VALUES ('NDFRT-ontology', 'https://github.com/allisonbmccoy/smart-summarization');"
cat ndfrt.csv | psql -d $DB -c 'COPY problems_meds (RXCUI, CID) FROM STDIN WITH CSV;'
psql -d $DB -c "INSERT INTO problems_meds_sources (source_desc, source_ref) VALUES ('NDFRT', 'https://github.com/allisonbmccoy/smart-summarization');"
psql -d $DB -c 'ALTER TABLE Problems_Meds ADD CONSTRAINT Problems_Meds_pkey PRIMARY KEY (CID, RXCUI, source_id);'
psql -d $DB -c 'CREATE INDEX problems_meds_source_id_idx ON problems_meds(source_id);'
psql -d $DB -c 'UPDATE problems_meds SET source_id = 2 WHERE source_id = 0;'
