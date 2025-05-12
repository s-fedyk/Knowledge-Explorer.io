provider "aws" {
  region = "us-east-2"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "knowledge-explorer-vpc"
  }
}

# Public subnets in two different AZs
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"  # 10.0.0.0/24 and 10.0.1.0/24
  availability_zone       = "us-east-2${count.index == 0 ? "a" : "b"}"  # us-east-2a and us-east-2b
  map_public_ip_on_launch = true
  tags = {
    Name = "knowledge-explorer-public-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "knowledge-explorer-igw"
  }
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "knowledge-explorer-public-rt"
  }
}

# Public route table associations
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security groups
resource "aws_security_group" "alb" {
  name        = "knowledge-explorer-alb-sg"
  description = "Security group for the application load balancer"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "knowledge-explorer-alb-sg"
  }
}

resource "aws_security_group" "backend" {
  name        = "knowledge-explorer-backend-sg"
  description = "Security group for backend Fargate service"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB only"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "knowledge-explorer-backend-sg"
  }
}


resource "aws_security_group" "mongodb" {
  name        = "knowledge-explorer-mongodb-sg"
  description = "Security group for MongoDB"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "Allow MongoDB access from backend service"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "knowledge-explorer-mongodb-sg"
  }
}

# Security group for Neo4j
resource "aws_security_group" "neo4j" {
  name        = "knowledge-explorer-neo4j-sg"
  description = "Security group for Neo4j"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 7474
    to_port         = 7474
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "Allow Neo4j HTTP access from backend service"
  }
  
  ingress {
    from_port       = 7687
    to_port         = 7687
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "Allow Neo4j Bolt access from backend service"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "knowledge-explorer-neo4j-sg"
  }
}

resource "aws_efs_file_system" "mongodb_data" {
  creation_token = "mongodb-data"
  tags = {
    Name = "knowledge-explorer-mongodb-data"
  }
}

resource "aws_efs_file_system" "mongodb_config" {
  creation_token = "mongodb-config"
  tags = {
    Name = "knowledge-explorer-mongodb-config"
  }
}

# EFS for Neo4j data persistence
resource "aws_efs_file_system" "neo4j_data" {
  creation_token = "neo4j-data"
  tags = {
    Name = "knowledge-explorer-neo4j-data"
  }
}

resource "aws_efs_file_system" "neo4j_logs" {
  creation_token = "neo4j-logs"
  tags = {
    Name = "knowledge-explorer-neo4j-logs"
  }
}

resource "aws_efs_file_system" "neo4j_import" {
  creation_token = "neo4j-import"
  tags = {
    Name = "knowledge-explorer-neo4j-import"
  }
}

resource "aws_efs_file_system" "neo4j_plugins" {
  creation_token = "neo4j-plugins"
  tags = {
    Name = "knowledge-explorer-neo4j-plugins"
  }
}

# Updated security group for EFS access
resource "aws_security_group" "efs" {
  name        = "knowledge-explorer-efs-sg"
  description = "Security group for EFS mount targets"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 2049  # NFS port
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [
      aws_security_group.backend.id,
      aws_security_group.mongodb.id,
      aws_security_group.neo4j.id
    ]
    description     = "Allow NFS traffic from all services"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "knowledge-explorer-efs-sg"
  }
}

# Update all EFS mount targets to use the EFS security group
resource "aws_efs_mount_target" "mongodb_data" {
  count = 2
  file_system_id = aws_efs_file_system.mongodb_data.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "mongodb_config" {
  count = 2
  file_system_id = aws_efs_file_system.mongodb_config.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "neo4j_data" {
  count = 2
  file_system_id = aws_efs_file_system.neo4j_data.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "neo4j_logs" {
  count = 2
  file_system_id = aws_efs_file_system.neo4j_logs.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "neo4j_import" {
  count = 2
  file_system_id = aws_efs_file_system.neo4j_import.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_mount_target" "neo4j_plugins" {
  count = 2
  file_system_id = aws_efs_file_system.neo4j_plugins.id
  subnet_id      = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}
