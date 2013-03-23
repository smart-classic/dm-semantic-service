# Create/setup all of the semantic services postgres databases
# v.20130322

# Check arguments
if [ "$1" != "prod" -a "$1" != "stage" -a "$1" != "dev" ]; then
    echo "Usage: $0 {prod|stage|dev}"
    exit 1
fi

# Create databases
cd `dirname $0`
./setup-de_ident.sh $1
./setup-cart.sh $1
./setup-problems_meds.sh $1
./setup-ident.sh $1
./setup-diverse.sh $1
echo '============================='
echo '========== Done!!! ==========' `date`
echo '============================='
