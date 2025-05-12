output "alb_dns_name" {
  value       = aws_lb.backend.dns_name
  description = "The DNS name of the load balancer"
}

output "ecr_repository_url" {
  value       = "577638366499.dkr.ecr.us-east-2.amazonaws.com/knowledge-explorer"
  description = "The URL of the ECR repository"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.backend.name
  description = "The name of the ECS service"
}
