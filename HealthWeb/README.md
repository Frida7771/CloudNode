# HealthWeb

## Introduction 
HealthWeb is a simple web application designed to test the connectivity to a PostgreSQL database and monitor the status of the API through a dedicated /healthz endpoint.

## Pre-requisites
- Download and install Node 20.15.1 or higher or the LTS version
- Download and install PostgreSQL 16 or higher
- create a database csye6225webapp in postgreSQL

## How to Run the application
- Clone the application in your laptop or computer
- Go to the root directory (HealthWeb) of the application
- Run command "npm install" or "npm i" to install the dependencies
- Go to "app" directory
- add .env file in source directory
- add the credentials (host, user, password, database, port) of the database
- Run command "node app.js" in terminal
- Application will start running at localhost:3000
