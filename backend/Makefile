# Define variables
AWS_REGION ?= us-east-2
ECR_REPOSITORY ?= knowledge-explorer-backend
IMAGE_TAG ?= latest

# Get AWS account ID
AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query "Account" --output text)
ECR_REPO_URI := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY)

restart: down
	- docker compose build
	- docker compose up -d

down:
	- docker compose down

build:
	- docker build -t $(ECR_REPOSITORY):$(IMAGE_TAG) .

# Add ECR push target
ecr-push: build
	# Login to ECR
	- aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	# Tag the image
	- docker tag $(ECR_REPOSITORY):$(IMAGE_TAG) $(ECR_REPO_URI):$(IMAGE_TAG)
	# Push the image
	- docker push $(ECR_REPO_URI):$(IMAGE_TAG)
	@echo "Successfully pushed $(ECR_REPO_URI):$(IMAGE_TAG)"

# Create ECR repository if it doesn't exist
create-ecr:
	- aws ecr describe-repositories --repository-names $(ECR_REPOSITORY) --region $(AWS_REGION) || aws ecr create-repository --repository-name $(ECR_REPOSITORY) --region $(AWS_REGION)
	@echo "ECR repository $(ECR_REPOSITORY) is ready"

# Complete pipeline: build, create ECR repo if needed, and push
deploy: build create-ecr ecr-push
	@echo "Deployment completed successfully"
