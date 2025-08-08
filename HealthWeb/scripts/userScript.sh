#!/bin/bash
# Create group and user
sudo groupadd frida
sudo useradd -r -g frida -s /usr/sbin/nologin frida

# Ensure correct permissions for the web application
sudo chown -R frida:frida /opt/healthweb