# Install semantic services
# v.20130321

# Check arguments
if [[ "$1" != "prod" && "$1" != "stage" && "$1" != "dev" ]]; then
    echo "Usage: $0 {prod|stage|dev}"
    exit 1
fi

# Install node.js modules
echo "Installing node.js modules..."
sudo npm install

# Patch restify
mv node_modules/restify/lib/response.js node_modules/restify/lib/response.js.bak
cp -p restify-changes/response.js node_modules/restify/lib

# Setup databases
echo
echo "Setting up databases..."
sudo -u postgres ./postgres/setup-all.sh $1 &> /tmp/semantic-setup-dbs-$1.log

# Deploy files / setup service
if [ "$1" == "prod" ]; then
    sudo mkdir -p /usr/smart/semantic
    sudo cp -p *.js *.xml *.html /usr/smart/semantic

    sudo mkdir -p /usr/smart/semantic/keys

    sudo cp -p upstart/semantic.conf /etc/init

elif [ "$1" == "stage" ]; then
    sudo mkdir -p /usr/smart/semantic-stage
    sudo cp -p *.js *.xml *.html /usr/smart/semantic-stage

    sudo mkdir -p /usr/smart/semantic-stage/keys

    sudo cp -p upstart/semantic-stage.conf /etc/init
fi

# Start services
if [ "$1" == "prod" ]; then
    echo "Starting production services."
    sudo start semantic
elif [ "$1" == "stage" ]; then
    echo "Starting staging services."
    sudo start semantic-stage
else
    echo "Installation complete."
fi

echo "Check npm-debug.log and /tmp/semantic-setup-dbs-$1.log for any problems."
