resource "aws_db_subnet_group" "main" {
  name       = "${var.db_name}-${var.environment}-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.db_name}-${var.environment}-subnet-group"
    Environment = var.environment
  }
}

# RDS Enhanced Monitoring (monitoring_interval > 0, enabled below for prod)
# requires an IAM role RDS can assume to publish metrics to CloudWatch —
# without it, `terraform apply` fails with "Monitoring Role ARN must be set
# when Monitoring Interval is set to a value other than 0".
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.environment == "prod" ? 1 : 0

  name = "${var.db_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })

  tags = {
    Name        = "${var.db_name}-${var.environment}-rds-monitoring"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count = var.environment == "prod" ? 1 : 0

  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.db_name}-${var.environment}-params"
  family = "mysql8.0"

  parameter {
    name  = "general_log"
    value = "0"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  parameter {
    name         = "require_secure_transport"
    value        = "ON"
    apply_method = "immediate"
  }

  tags = {
    Name        = "${var.db_name}-${var.environment}-params"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.db_name}-${var.environment}"
  allocated_storage       = var.environment == "prod" ? 100 : 20
  max_allocated_storage   = var.environment == "prod" ? 500 : 100
  storage_type            = "gp3"
  storage_encrypted       = true
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  parameter_group_name    = aws_db_parameter_group.main.name
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = var.security_group_ids
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.db_name}-${var.environment}-final-snapshot" : null
  deletion_protection     = var.environment == "prod" ? true : false
  multi_az                = var.environment == "prod" ? true : false
  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot   = true

  performance_insights_enabled          = var.environment == "prod" ? true : false
  performance_insights_retention_period = var.environment == "prod" ? 7 : null
  monitoring_interval                   = var.environment == "prod" ? 60 : 0
  monitoring_role_arn                   = var.environment == "prod" ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
  enabled_cloudwatch_logs_exports       = ["error", "slowquery"]

  tags = {
    Name        = "${var.db_name}-${var.environment}"
    Environment = var.environment
  }
}
