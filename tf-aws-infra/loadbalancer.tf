resource "aws_lb" "web_app_lb" {
  name               = "web-app-load-balancer"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.load_balancer_sg.id]
  subnets            = tolist([for subnet in aws_subnet.public_subnets : subnet.id])
}

resource "aws_lb_target_group" "web_app_tg" {
  name     = "web-app-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/healthz"
    port                = "traffic-port" # Use the port defined in the target group
    protocol            = "HTTP"
    interval            = 30 # Health check interval in seconds
    timeout             = 5  # Timeout for each health check attempt
    healthy_threshold   = 2  # Number of successful checks to consider the target healthy
    unhealthy_threshold = 2  # Number of failed checks to consider the target unhealthy
  }
}

resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = aws_lb.web_app_lb.arn
  port              = 443
  protocol          = "HTTPS"

  ssl_policy      = "ELBSecurityPolicy-2016-08"
  certificate_arn = data.aws_acm_certificate.ssl_certificate.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app_tg.arn
  }
}
