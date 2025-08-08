#!/bin/bash
  
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Move the CloudWatch configuration file to the correct directory
sudo mv /tmp/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/bin/cloudwatch-config.json

# Create the logs directory and app.log file with necessary permissions
sudo mkdir -p /opt/healthweb/logs
sudo touch /opt/healthweb/logs/app.log
sudo chmod 666 /opt/healthweb/logs/app.log
sudo chown -R ubuntu:ubuntu /opt/healthweb/logs

# Start CloudWatch Agent with the configuration
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a stop
# sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start -c file:/opt/aws/amazon-cloudwatch-agent/bin/cloudwatch-config.json