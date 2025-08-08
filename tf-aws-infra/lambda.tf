# Create Lambda Function
resource "aws_lambda_function" "email_verification_lambda" {
  function_name = "email-verification-lambda"
  runtime       = "nodejs20.x" # Replace with your runtime
  role          = aws_iam_role.lambda_role.arn
  handler       = "serverless-fork/index.handler" # entry point of serverless

  # Lambda deployment package
  filename         = "${var.serverless_file_path}/serverless-fork.zip"
  source_code_hash = filebase64sha256("${var.serverless_file_path}/serverless-fork.zip")

  # Environment variables
  environment {
    variables = {
      RDS_HOST      = aws_db_instance.default.address
      DB_DATABASE   = var.db_name
      DB_USER       = var.db_username
      SENDER_EMAIL  = var.sender_email
      SNS_TOPIC_ARN = aws_sns_topic.email_verification_topic.arn
      DOMAIN        = "${var.subdomain}.${var.domain}"
    }
  }

  # Timeout and memory size
  timeout     = 30
  memory_size = 128
}

# Grant permission to SNS to invoke Lambda
resource "aws_lambda_permission" "allow_sns_invocation" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_verification_lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.email_verification_topic.arn
}

# SNS Topic Subscription for Lambda (SNS triggers Lambda directly)
resource "aws_sns_topic_subscription" "email_verification_subscription" {
  topic_arn = aws_sns_topic.email_verification_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.email_verification_lambda.arn
}

data "aws_acm_certificate" "ssl_certificate" {
  domain      = "${var.subdomain}.${var.domain}"
  most_recent = true
  statuses    = ["ISSUED"]
}

# SNS Topic Subscription
#resource "aws_sns_topic_subscription" "email_verification_subscription" {
#  topic_arn = aws_sns_topic.email_verification_topic.arn
#  protocol  = "email"
#  endpoint  = "ankush97m@gmail.com"
#}
