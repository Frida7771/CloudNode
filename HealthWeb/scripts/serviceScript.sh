#!/bin/bash
# Move service file and enable it
sudo mv /tmp/healthweb.service /etc/systemd/system/healthweb.service
sudo systemctl daemon-reload
sudo systemctl enable healthweb.service
sudo systemctl start healthweb.service