#!/bin/bash
set -e

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}   Simple Backend EC2 Deployment   ${NC}"
echo -e "${GREEN}====================================${NC}"

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
echo -e "\n${GREEN}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi
echo -e "${GREEN}AWS credentials validated.${NC}"

# Check for Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${YELLOW}Terraform not found. Would you like to install it? (y/n)${NC}"
    read -r install_terraform
    if [[ "$install_terraform" == "y" ]]; then
        echo -e "${GREEN}Installing Terraform...${NC}"
        # This is a simple install for Ubuntu/Debian - adjust as needed
        sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
        wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
        sudo apt-get update && sudo apt-get install terraform
    else
        echo -e "${RED}Terraform is required for deployment.${NC}"
        exit 1
    fi
fi

# Check for Ansible
if ! command -v ansible &> /dev/null; then
    echo -e "${YELLOW}Ansible not found. Would you like to install it? (y/n)${NC}"
    read -r install_ansible
    if [[ "$install_ansible" == "y" ]]; then
        echo -e "${GREEN}Installing Ansible...${NC}"
        sudo apt update
        sudo apt install -y ansible
    else
        echo -e "${RED}Ansible is required for server configuration.${NC}"
        exit 1
    fi
fi

# Initialize and apply Terraform
echo -e "\n${GREEN}Initializing Terraform...${NC}"
cd "$(dirname "$0")"
terraform init

echo -e "\n${GREEN}Planning infrastructure changes...${NC}"
terraform plan -out=tfplan

echo -e "\n${GREEN}Applying infrastructure changes...${NC}"
terraform apply tfplan

# Get the backend IP from Terraform output
BACKEND_IP=$(terraform output -raw backend_public_ip)
echo -e "\n${GREEN}Backend server provisioned at: ${BACKEND_IP}${NC}"

# Wait for SSH to be available
echo -e "\n${GREEN}Waiting for SSH to become available...${NC}"
while ! ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$BACKEND_IP echo "SSH is up" &> /dev/null; do
    echo "Still waiting for SSH..."
    sleep 5
done
echo -e "${GREEN}SSH is now available.${NC}"

# Create Ansible inventory
echo -e "\n${GREEN}Creating Ansible inventory...${NC}"
mkdir -p "$(dirname "$0")/ansible/inventory"
cat > "$(dirname "$0")/ansible/inventory/hosts" << EOF
[backend]
backend ansible_host=$BACKEND_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/your-key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'
EOF

# Run Ansible playbook
echo -e "\n${GREEN}Configuring server with Ansible...${NC}"
cd "$(dirname "$0")/ansible"
ansible-playbook -i inventory/hosts playbooks/site.yml

echo -e "\n${GREEN}Deployment complete!${NC}"
echo -e "Your backend is now accessible at: http://$BACKEND_IP:8000"
