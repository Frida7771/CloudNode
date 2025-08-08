resource "aws_db_parameter_group" "custom_pg" {
  name        = "custom-pg"
  family      = "postgres13"
  description = "Custom Parameter Group for RDS"

  # Example parameter to log queries that take more than 1 second
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # 1 second in milliseconds
  }
}