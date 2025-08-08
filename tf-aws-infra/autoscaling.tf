# Auto Scaling Group
resource "aws_autoscaling_group" "web_app_asg" {
  name = "HealthwebAutoScalingGroup"
  launch_template {
    id      = aws_launch_template.frida_asg_template.id
    version = "$Latest"
  }

  min_size            = 3                               # Minimum number of instances
  max_size            = 5                               # Maximum number of instances
  desired_capacity    = 3                               # Initial number of instances
  vpc_zone_identifier = aws_subnet.public_subnets[*].id # Fetch all public subnet IDs
  target_group_arns   = [aws_lb_target_group.web_app_tg.arn]

  # Tags for AutoScaling Group and EC2 instances
  tag {
    key                 = "Name"
    value               = "AutoScalingHealthwebInstance"
    propagate_at_launch = true # Ensure tags are applied to launched instances
  }

  tag {
    key                 = "Environment"
    value               = "Production"
    propagate_at_launch = true
  }
}

# Scale-Up Policy
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale_up"
  scaling_adjustment     = 1 # Increment by 1 instance
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60 # Cooldown period in seconds
  autoscaling_group_name = aws_autoscaling_group.web_app_asg.name
}

# Scale-Down Policy
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale_down"
  scaling_adjustment     = -1 # Decrement by 1 instance
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60 # Cooldown period in seconds
  autoscaling_group_name = aws_autoscaling_group.web_app_asg.name
}

# High CPU Utilization Alarm (Scale-Up Trigger)
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "ASG_CPUHighAlarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60 # Evaluate every 60 seconds
  statistic           = "Average"
  threshold           = 5 # Trigger scale-up when CPU > 5%
  alarm_description   = "Alarm when average CPU utilization exceeds 5%"
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.web_app_asg.name
  }

  alarm_actions = [
    aws_autoscaling_policy.scale_up.arn
  ]
}

# Low CPU Utilization Alarm (Scale-Down Trigger)
resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "ASG_CPULowAlarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60 # Evaluate every 60 seconds
  statistic           = "Average"
  threshold           = 3 # Trigger scale-down when CPU < 3%
  alarm_description   = "Alarm when average CPU utilization drops below 3%"
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.web_app_asg.name
  }

  alarm_actions = [
    aws_autoscaling_policy.scale_down.arn
  ]
}
