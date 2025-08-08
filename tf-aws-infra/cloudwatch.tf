resource "aws_cloudwatch_log_group" "frida" {
  name              = "frida"
  retention_in_days = 7 # Set retention period, adjust as needed
}