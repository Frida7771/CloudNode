#!/bin/bash
# Navigate to the tmp directory
cd /tmp

# Unzip the web application
# sudo mv /tmp/healthweb /opt/
sudo unzip healthweb.zip -d /opt/healthweb   

# Navigate to the web application directory
cd /opt/healthweb

# Install Node.js dependencies
sudo npm install

# Run npm test to execute any test cases
# npm test

# Navigate to the app directory
# cd /opt/healthweb/app

# Start the Node.js server using node app.js and run it in the background
# nohup node app.js > app.log 2>&1 &