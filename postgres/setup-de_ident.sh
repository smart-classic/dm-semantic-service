# Create/setup the "de_ident" semantic services postgres databases
# v.20130322

# Check arguments
if [ "$1" != "prod" -a "$1" != "stage" -a "$1" != "dev" ]; then
    echo "Usage: $0 {prod|stage|dev}"
    exit 1
fi

# Build database name
if [ "$1" = "prod" ]; then
    DB=org_smartplatforms_semantic_de_ident
else
    DB=org_smartplatforms_semantic_de_ident_$1
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
echo '========== de_ident ==========' $(date)
cat de_ident-schema.sql | psql -d $DB

