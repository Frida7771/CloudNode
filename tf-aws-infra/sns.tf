# Create an SNS Topic
resource "aws_sns_topic" "email_verification_topic" {
  name = "email-verification-topic"
}