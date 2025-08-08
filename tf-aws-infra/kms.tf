resource "aws_kms_key" "ec2_key" {
  description         = "KMS key for EC2 encryption"
  enable_key_rotation = true
  # rotation_period     = "90"
  tags = {
    Name = "ec2-key"
  }
}

resource "aws_kms_alias" "ec2_key_alias" {
  name          = "alias/ec2-key-alias"
  target_key_id = aws_kms_key.ec2_key.id

}

resource "aws_kms_key" "rds_key" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17",
    Id      = "key-default-1",
    Statement = [
      {
        Sid    = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:root"
        },
        Action   = "kms:*",
        Resource = "*"
      },
      {
        Sid    = "Allow RDS to use the key",
        Effect = "Allow",
        Principal = {
          Service = "rds.amazonaws.com"
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "rds-key"
  }
}

resource "aws_kms_alias" "rds_key_alias" {
  name          = "alias/rds-key-alias"
  target_key_id = aws_kms_key.rds_key.id
}

resource "aws_kms_key" "s3_key" {
  description         = "KMS key for S3 encryption"
  enable_key_rotation = true

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "EnableIAMUserPermissions",
        "Effect" : "Allow",
        "Principal" : {
          "AWS" : "arn:aws:iam::${var.account_id}:root"
        },
        "Action" : "kms:*",
        "Resource" : "*"
      },
      {
        "Sid" : "AllowS3AccessToKMSKey",
        "Effect" : "Allow",
        "Principal" : {
          # "AWS" : "arn:aws:iam::${var.account_id}:role/CloudWatchAgentRole"
          "AWS" : "*"
        },
        "Action" : [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ],
        "Resource" : "*"
      }
    ]
  })

  tags = {
    Name = "s3-key"
  }
}

resource "aws_kms_alias" "s3_key_alias" {
  name          = "alias/s3-key-alias"
  target_key_id = aws_kms_key.s3_key.id
}

resource "aws_kms_key" "secrets_manager_key" {
  description         = "KMS key for Secrets Manager"
  enable_key_rotation = true
  tags = {
    Name = "secrets-manager-key"
  }
}

resource "aws_kms_alias" "secrets_manager_key_alias" {
  name          = "alias/secrets-manager-key-alias"
  target_key_id = aws_kms_key.secrets_manager_key.id
}

# Generate a secure random password
resource "random_password" "db_password" {
  length           = 16
  special          = true
  upper            = true
  lower            = true
  override_special = "_-"

}

resource "aws_secretsmanager_secret" "db_password" {
  name       = "db-password-13"
  kms_key_id = aws_kms_key.secrets_manager_key.arn
}

resource "aws_secretsmanager_secret_version" "db_password_version" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({ password = random_password.db_password.result })
}

resource "aws_secretsmanager_secret" "sendgrid_creds" {
  name       = "sendgrid-credentials-13"
  kms_key_id = aws_kms_key.secrets_manager_key.arn
}

resource "aws_secretsmanager_secret_version" "sendgrid_creds_version" {
  secret_id     = aws_secretsmanager_secret.sendgrid_creds.id
  secret_string = jsonencode({ apiKey = var.sendgrid_api_key })
}
