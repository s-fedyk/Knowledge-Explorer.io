# Makefile for building and deploying to AWS S3

# Variables
BUILD_DIR = dist
BUCKET_NAME = knowledge-explorer.io
AWS_PATH = s3://$(BUCKET_NAME)/

# Default target
.PHONY: all
all: build deploy

# Build the project using npm
.PHONY: build
build:
	@echo "Building project with npm..."
	npm run build

# Deploy to AWS S3
.PHONY: deploy
deploy: build
	@echo "Uploading dist directory to AWS S3 bucket: $(BUCKET_NAME)..."
	aws s3 cp $(BUILD_DIR) $(AWS_PATH) --recursive
	@echo "Deployment complete!"

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning up build artifacts..."
	rm -rf $(BUILD_DIR)

# Help command
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make        - Build project and deploy to AWS"
	@echo "  make build  - Build project using npm run build"
	@echo "  make deploy - Deploy dist directory to AWS S3 bucket"
	@echo "  make clean  - Remove build artifacts"
	@echo "  make help   - Display this help message"
