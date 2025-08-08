resource "aws_db_subnet_group" "main" {
  name       = "frida-db-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id


}
