#!/bin/bash
set -e

sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -i -u postgres bash <<END
# Update the password for the postgres user
psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"

# Create a new database with the specified name
createdb $DB_NAME

# Grant all privileges on the database to the postgres user
psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO postgres;"
END
psql --version