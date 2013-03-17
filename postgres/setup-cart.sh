# Create/setup the "cart" semantic services postgres databases
# v.20130221

# Check arguments
if [[ "$1" != "prod" && "$1" != "stage" && "$1" != "dev" ]]; then
    echo "Usage: $0 {prod|stage|dev}"
    exit 1
fi

# Build database name
if [ "$1" == "prod" ]; then
    DB=org_smartplatforms_semantic_cart
else
    DB=org_smartplatforms_semantic_cart_$1
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
echo '========== cart ==========' $(date)
cat cart-schema.sql | psql -d $DB

