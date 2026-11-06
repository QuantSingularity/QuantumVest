environment          = "dev"
app_name             = "quantumvest"
aws_region           = "us-west-2"
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.4.0/24", "10.0.5.0/24"]
instance_type        = "t3.small"
db_instance_class    = "db.t3.micro"
db_name              = "quantumvestdb"
allowed_ssh_cidr     = "10.0.0.0/8"
# db_username and db_password must be provided via -var flag or environment variables:
# TF_VAR_db_username, TF_VAR_db_password
