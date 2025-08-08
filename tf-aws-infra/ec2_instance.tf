resource "aws_launch_template" "frida_asg_template" {
  name          = "frida_asg"
  image_id      = var.custom_ami_id
  instance_type = "t2.micro"
  key_name      = null
  # key_name      = var.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.cloudwatch_instance_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.app_sg.id]
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash

              # Update and install necessary tools
              sudo apt-get update
              sudo snap install aws-cli --classic
              sudo apt-get install -y postgresql-client jq

              # Fetch the database secret from AWS Secrets Manager
              # aws secretsmanager get-secret-value --secret-id db-password-5 --region us-east-1 | jq -r '.SecretString' > /opt/webapp/app/db-secret.json
              aws secretsmanager get-secret-value \
                --secret-id db-password-13 \
                --region ${var.region} | jq -r '.SecretString' > /opt/webapp/app/db-secret.json

              # Extract the password from the secrets file
              DB_PASSWORD=$(jq -r '.password' /opt/webapp/app/db-secret.json)

              # Create the database
              PGPASSWORD="$DB_PASSWORD" psql -h ${aws_db_instance.default.address} -U ${var.db_username} -p ${var.db_port} postgres <<-EOSQL
              CREATE DATABASE ${var.db_name};
              EOSQL

              # Remove the existing .env file if it exists
              if [ -f /opt/webapp/app/.env ]; then
                rm /opt/webapp/app/.env
              fi

              # Write environment variables to .env file
              echo DB_DATABASE=${var.db_name} >> /opt/healthweb/app/.env
              echo DB_USER=${var.db_username} >> /opt/healthweb/app/.env
              echo DB_PASSWORD=$DB_PASSWORD >> /opt/healthwebp/app/.env
              echo DB_PORT=5432 >> /opt/healthweb/app/.env
              echo DB_HOST=${aws_db_instance.default.address} >> /opt/healthweb/app/.env
              echo AWS_REGION=${var.region} >> /opt/healthweb/app/.env
              echo S3_BUCKET_NAME=${aws_s3_bucket.profile_pics.bucket} >> /opt/healthweb/app/.env
              echo SNS_REGION=${var.region} >> /opt/healthweb/app/.env
              echo SNS_TOPIC_ARN=${aws_sns_topic.email_verification_topic.arn} >> /opt/healthweb/app/.env

              # Enable and start the web application service
              sudo systemctl enable healthweb.service
              sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
                -a fetch-config \
                -m ec2 \
                -c file:/opt/aws/amazon-cloudwatch-agent/bin/cloudwatch-config.json \
                -s

              sudo systemctl daemon-reload
              sudo systemctl restart healthweb.service
EOF
  )


  tags = {
    Name = "Web Application Instance"
  }
}
