provider "aws" {
  region = "us-east-2"  
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "knowledge-explorer-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = true
  tags = {
    Name = "backend-public-subnet"
  }
}

# Create an internet gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "backend-igw"
  }
}

# Create a route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "backend-public-rt"
  }
}

# Associate route table with subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Create a security group for the backend
resource "aws_security_group" "backend" {
  name        = "backend-sg"
  description = "Security group for backend application"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP access on port 8000
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "App port"
  }

  # Allow SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Consider restricting to your IP
    description = "SSH"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "backend-sg"
  }
}

# Create an EC2 instance for the backend
resource "aws_instance" "backend" {
  ami                    = "ami-024e6efaf93d85776"  # Ubuntu 22.04 LTS in us-east-1
  instance_type          = "t3.micro"  # Adjust based on your needs
  key_name               = "acces"  # Replace with your SSH key name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.backend.id]

  root_block_device {
    volume_size = 20  # GB
    volume_type = "gp3"
  }

  tags = {
    Name = "backend-server"
  }
}

# Output the public IP of the backend server
output "backend_public_ip" {
  value = aws_instance.backend.public_ip
}
