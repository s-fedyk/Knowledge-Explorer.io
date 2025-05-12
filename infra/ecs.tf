
variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "knowledge-explorer-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/knowledge-explorer-backend"
  retention_in_days = 30
}

# CloudWatch log group for MongoDB
resource "aws_cloudwatch_log_group" "mongodb" {
  name              = "/ecs/knowledge-explorer-mongodb"
  retention_in_days = 30
}

# CloudWatch log group for Neo4j
resource "aws_cloudwatch_log_group" "neo4j" {
  name              = "/ecs/knowledge-explorer-neo4j"
  retention_in_days = 30
}

resource "aws_ecs_task_definition" "mongodb" {
  family                   = "knowledge-explorer-mongodb"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"  # 0.5 vCPU
  memory                   = "1024" # 1GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  
  volume {
    name = "mongodb-data"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.mongodb_data.id
      root_directory = "/"
    }
  }
  
  volume {
    name = "mongodb-config"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.mongodb_config.id
      root_directory = "/"
    }
  }
  
  container_definitions = jsonencode([
    {
      name      = "mongodb"
      image     = "mongo:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 27017
          hostPort      = 27017
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "MONGO_INITDB_ROOT_USERNAME"
          value = "admin"
        },
        {
          name  = "MONGO_INITDB_ROOT_PASSWORD"
          value = "password"
        }
      ]
      
      mountPoints = [
        {
          sourceVolume  = "mongodb-data"
          containerPath = "/data/db"
          readOnly      = false
        },
        {
          sourceVolume  = "mongodb-config"
          containerPath = "/data/configdb"
          readOnly      = false
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.mongodb.name
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "mongodb"
        }
      }
    }
  ])
}

# Task Definition for Neo4j
resource "aws_ecs_task_definition" "neo4j" {
  family                   = "knowledge-explorer-neo4j"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"  # 1 vCPU
  memory                   = "2048"  # 2GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  
  volume {
    name = "neo4j-data"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.neo4j_data.id
      root_directory = "/"
    }
  }
  
  volume {
    name = "neo4j-logs"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.neo4j_logs.id
      root_directory = "/"
    }
  }
  
  volume {
    name = "neo4j-import"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.neo4j_import.id
      root_directory = "/"
    }
  }
  
  volume {
    name = "neo4j-plugins"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.neo4j_plugins.id
      root_directory = "/"
    }
  }
  container_definitions = jsonencode([
    {
      name      = "neo4j"
      image     = "neo4j:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 7474
          hostPort      = 7474
          protocol      = "tcp"
        },
        {
          containerPort = 7687
          hostPort      = 7687
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NEO4J_AUTH"
          value = "neo4j/password"
        },
        {
          name  = "NEO4J_apoc_export_file_enabled"
          value = "true"
        },
        {
          name  = "NEO4J_apoc_import_file_enabled"
          value = "true"
        },
        {
          name  = "NEO4J_apoc_import_file_use__neo4j__config"
          value = "true"
        },
        {
          name  = "NEO4J_PLUGINS"
          value = jsonencode(["apoc"])
        }
      ]
      mountPoints = [
        {
          sourceVolume  = "neo4j-data"
          containerPath = "/data"
          readOnly      = false
        },
        {
          sourceVolume  = "neo4j-logs"
          containerPath = "/logs"
          readOnly      = false
        },
        {
          sourceVolume  = "neo4j-import"
          containerPath = "/var/lib/neo4j/import"
          readOnly      = false
        },
        {
          sourceVolume  = "neo4j-plugins"
          containerPath = "/plugins"
          readOnly      = false
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.neo4j.name
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "neo4j"
        }
      }
    }
  ])
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "knowledge-explorer-task-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "knowledge-explorer-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"  # 0.5 vCPU
  memory                   = "1024" # 1GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  
  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "577638366499.dkr.ecr.us-east-2.amazonaws.com/knowledge-explorer-backend:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "OPENAI_API_KEY"
          value = "${var.openai_api_key}" # You'll need to add this variable
        },
        {
          name  = "ENV"
          value = "production"
        },
        {
          name  = "NEO4J_URI"
          value = "bolt://${aws_ecs_service.neo4j.name}.${aws_ecs_cluster.main.name}.local:7687"
        },
        {
          name  = "NEO4J_USERNAME"
          value = "neo4j"
        },
        {
          name  = "NEO4J_PASSWORD"
          value = "password"
        },
        {
          name  = "MONGODB_URI"
          value = "mongodb://admin:password@${aws_ecs_service.mongodb.name}.${aws_ecs_cluster.main.name}.local:27017"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

# Application Load Balancer
resource "aws_lb" "backend" {
  name               = "knowledge-explorer-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id  # Reference all public subnets
  enable_deletion_protection = false
  tags = {
    Name = "knowledge-explorer-alb"
  }
}

# Target Group
resource "aws_lb_target_group" "backend" {
  name        = "knowledge-explorer-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/health" # Adjust based on your app
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200" # HTTP status code
  }
}

# Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}


# Service Discovery namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${aws_ecs_cluster.main.name}.local"
  description = "Private DNS namespace for ECS services"
  vpc         = aws_vpc.main.id
}

# Service Discovery for MongoDB - use a hardcoded name instead of referencing the service
resource "aws_service_discovery_service" "mongodb" {
  name = "knowledge-explorer-mongodb"
  
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Service Discovery for Neo4j - use a hardcoded name instead of referencing the service
resource "aws_service_discovery_service" "neo4j" {
  name = "knowledge-explorer-neo4j"
  
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Modified ECS Service for MongoDB - make sure the name matches service discovery
resource "aws_ecs_service" "mongodb" {
  name            = "knowledge-explorer-mongodb"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mongodb.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = [aws_subnet.public[0].id]
    security_groups  = [aws_security_group.mongodb.id]
    assign_public_ip = true
  }
  
  service_registries {
    registry_arn = aws_service_discovery_service.mongodb.arn
  }

  depends_on = [
    aws_efs_mount_target.mongodb_data,
    aws_efs_mount_target.mongodb_config
  ]
}

# Modified ECS Service for Neo4j - make sure the name matches service discovery
resource "aws_ecs_service" "neo4j" {
  name            = "knowledge-explorer-neo4j"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.neo4j.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = [aws_subnet.public[0].id]
    security_groups  = [aws_security_group.neo4j.id]
    assign_public_ip = true
  }
  
  service_registries {
    registry_arn = aws_service_discovery_service.neo4j.arn
  }
  depends_on = [
    aws_efs_mount_target.neo4j_data,
    aws_efs_mount_target.neo4j_logs,
    aws_efs_mount_target.neo4j_import,
    aws_efs_mount_target.neo4j_plugins
  ]
}

# Modified Backend Service
resource "aws_ecs_service" "backend" {
  name            = "knowledge-explorer-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = [aws_subnet.public[0].id]
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true
  }
  
  # load balancer targets our backend containers
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }
  
  depends_on = [aws_lb_listener.http]
}
