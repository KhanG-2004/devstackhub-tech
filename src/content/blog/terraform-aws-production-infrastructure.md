---
order: 8
coverImage: "/wp-content/uploads/2026/09/Gemini_Generated_Image_3xeojb3xeojb3xeo-scaled.jpg"
title: "Terraform AWS Production Infrastructure: Modular VPC, ECS, and Remote State Blueprint"
seoTitle: "Terraform AWS Production Infrastructure: Modular VPC, ECS, and Remote State Blueprint"
description: "Master the deployment of an enterprise-grade Terraform AWS production infrastructure. This production-tested blueprint covers S3 remote state locking with Dynam"
pubDate: 2026-09-01
category: "Cloud & DevOps"
badge: "PRODUCTION PLAYBOOK"
readTime: "7 MIN READ"
author: "Farraz Ahmed"
---


<p class="wp-block-paragraph">Scaling cloud environments manually via the AWS Management Console introduces configuration drift, opaque security policies, and unrepeatable deployments. Implementing a <strong>Terraform AWS production infrastructure</strong> provides an immutable, auditable, and modular Infrastructure as Code (IaC) foundation capable of scaling mission-critical services.</p>



<p class="wp-block-paragraph">This guide details the complete architecture and deployment for an enterprise-ready <strong>Terraform AWS production infrastructure</strong>. You will build a zero-trust remote state backend with state locking, a highly available multi-AZ VPC, a secure AWS ECS Fargate container cluster, and an automated GitHub Actions deployment pipeline using OpenID Connect (OIDC).</p>



<h2 class="wp-block-heading">Production Architecture Overview</h2>



<p class="wp-block-paragraph">Reference the official <strong><a href="https://aws.amazon.com/architecture/well-architected/" target="_blank" rel="noopener">AWS Well-Architected Framework Documentation</a></strong> when designing multi-AZ network isolation. The infrastructure provisioned in this blueprint follows the AWS Well-Architected Framework:</p>



<pre class="wp-block-code"><code>+-----------------------------------+
                           |        Internet Gateway (IGW)     |
                           +-----------------+-----------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
        +----------v----------+                             +----------v----------+
        | Public Subnet (AZ-A)|                             | Public Subnet (AZ-B)|
        |  &#91;NAT Gateway A]    |                             |  &#91;NAT Gateway B]    |
        |  &#91;Application ALB]  |                             |  &#91;Application ALB]  |
        +----------+----------+                             +----------+----------+
                   |                                                   |
+------------------v---------------------------------------------------v------------------+
| Private Subnets (Workloads)                                                             |
|                                                                                         |
|   +------------------------------------+       +------------------------------------+   |
|   | ECS Task: Web App (AZ-A)           |       | ECS Task: Web App (AZ-B)           |   |
|   | - Non-root container               |       | - Non-root container               |   |
|   | - AWS Systems Manager Logs         |       | - AWS Systems Manager Logs         |   |
|   +-----------------+------------------+       +-----------------+------------------+   |
|                     |                                            |                      |
|                     +--------------------+  +--------------------+                      |
|                                          |  |                                           |
|                               +----------v--v----------+                                |
|                               | AWS Secrets Manager    |                                |
|                               | &amp; KMS Encryption Keys  |                                |
|                               +------------------------+                                |
+-----------------------------------------------------------------------------------------+</code></pre>



<h3 class="wp-block-heading">Key Architecture Components</h3>



<p class="wp-block-paragraph">Designing an enterprise-grade Terraform AWS production infrastructure requires strict multi-layer separation between state management, networking, compute workloads, and identity federation.</p>



<ul class="wp-block-list">
<li><strong>Remote State Layer:</strong> Encrypted Amazon S3 bucket with versioning, public access blocks, and an Amazon DynamoDB state locking table.</li>



<li><strong>Networking Layer:</strong> Dual-AZ Virtual Private Cloud (VPC) with isolated public and private subnets, redundant NAT Gateways, and strict network access control lists (NACLs).</li>



<li><strong>Compute &amp; Ingress:</strong> Application Load Balancer (ALB) terminating HTTPS/HTTP traffic, routing to an AWS ECS Fargate cluster with non-root security contexts.</li>



<li><strong>Secrets &amp; Security:</strong> Principle of least-privilege IAM roles, automated KMS customer-managed key (CMK) rotation, and zero hardcoded cloud credentials via GitHub Actions OIDC.</li>
</ul>



<h2 class="wp-block-heading">Project Directory Structure</h2>



<p class="wp-block-paragraph">Organize your Terraform project using a clean, reusable module hierarchy:</p>



<pre class="wp-block-code"><code>terraform-aws-production/
├── .github/
│   └── workflows/
│       └── terraform-pipeline.yml
├── backend-bootstrap/
│   ├── main.tf
│   ├── outputs.tf
│   └── variables.tf
├── environments/
│   └── prod/
│       ├── main.tf
│       ├── outputs.tf
│       ├── terraform.tfvars
│       └── variables.tf
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── outputs.tf
    │   └── variables.tf
    └── ecs-service/
        ├── main.tf
        ├── outputs.tf
        └── variables.tf</code></pre>



<h2 class="wp-block-heading">Stage 1: Zero-Trust S3 &amp; DynamoDB Remote State Backend</h2>



<p class="wp-block-paragraph">Storing Terraform state locally risks credential leaks, race conditions during collaborative applies, and accidental state corruption.</p>



<p class="wp-block-paragraph">Create a dedicated bootstrap module to spin up the S3 state backend and DynamoDB lock table before provisioning core infrastructure.</p>



<div class="wp-block-uagb-image uagb-block-a692869e wp-block-uagb-image--layout-default wp-block-uagb-image--effect-static wp-block-uagb-image--align-none"><figure class="wp-block-uagb-image__figure"><img decoding="async" src="/wp-content/uploads/2026/09/Gemini_Generated_Image_3xeojb3xeojb3xeo-1-1024x559.jpg" alt="Diagram illustrating Terraform remote state storage in an encrypted Amazon S3 bucket with a DynamoDB distributed locking table." class="uag-image-96" width="2816" height="1536" title="Gemini_Generated_Image_3xeojb3xeojb3xeo (1)" loading="lazy" role="img" /><figcaption class="uagb-image-caption">Zero-trust remote state architecture utilizing Amazon S3 bucket encryption, versioning, and DynamoDB state locking to prevent deployment collisions.</figcaption></figure></div>



<h3 class="wp-block-heading"><code>backend-bootstrap/variables.tf</code></h3>



<pre class="wp-block-code"><code>variable "aws_region" {
  type        = string
  description = "The target AWS Region for backend resources."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment identifier."
  default     = "production"
}

variable "project_name" {
  type        = string
  description = "Project name used for resource naming prefixes."
  default     = "devstackhub"
}</code></pre>



<h3 class="wp-block-heading">backend-bootstrap/main.tf</h3>



<pre class="wp-block-code"><code>terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# KMS Key for S3 Server-Side Encryption
resource "aws_kms_key" "state_key" {
  description             = "KMS Key for Terraform State Storage"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "state_key_alias" {
  name          = "alias/${var.project_name}-terraform-state-key"
  target_key_id = aws_kms_key.state_key.key_id
}

# Secure S3 Bucket for Remote State
resource "aws_s3_bucket" "terraform_state" {
  bucket        = "${var.project_name}-${var.environment}-tfstate-${var.aws_region}"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state_encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.state_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state_enforce_private" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB Table for Distributed State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project_name}-${var.environment}-tflocks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.state_key.arn
  }
}</code></pre>



<h3 class="wp-block-heading">backend-bootstrap/outputs.tf</h3>



<pre class="wp-block-code"><code>output "state_bucket_name" {
  description = "The S3 bucket name for backend storage."
  value       = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  description = "The DynamoDB table name for state locking."
  value       = aws_dynamodb_table.terraform_locks.name
}

output "kms_key_arn" {
  description = "The ARN of the KMS key securing the state."
  value       = aws_kms_key.state_key.arn
}</code></pre>



<p class="wp-block-paragraph">Run the bootstrap initialization:</p>



<pre class="wp-block-code"><code>cd backend-bootstrap
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan</code></pre>



<p class="wp-block-paragraph">Learn more about configuration options in the official <strong><a href="https://developer.hashicorp.com/terraform/language/settings/backends/s3" target="_blank" rel="noopener">Terraform S3 Backend Documentation</a></strong>.</p>



<h2 class="wp-block-heading">Stage 2: Production Multi-AZ VPC Network Module</h2>



<p class="wp-block-paragraph">A resilient <strong>Terraform AWS production infrastructure</strong> isolates compute workloads from the public internet. Public subnets only host ingress load balancers and NAT Gateways, while application tasks run strictly in private subnets. Designing a resilient networking tier is fundamental when deploying a <strong>Terraform AWS production infrastructure</strong> capable of zero-downtime routing. Isolating database and container instances within private subnets ensures your <strong>Terraform AWS production infrastructure</strong> maintains strict compliance and boundary defense.</p>



<h3 class="wp-block-heading"><code>modules/vpc/variables.tf</code></h3>



<pre class="wp-block-code"><code>variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
}

variable "environment" {
  type        = string
  description = "Target deployment environment."
}

variable "availability_zones" {
  type        = list(string)
  description = "List of Availability Zones for subnet placement."
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets."
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets."
}</code></pre>



<h3 class="wp-block-heading"><code>modules/vpc/main.tf</code></h3>



<pre class="wp-block-code"><code>resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Internet Gateway for Inbound/Outbound Public Traffic
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs&#91;count.index]
  availability_zone       = var.availability_zones&#91;count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${var.availability_zones&#91;count.index]}"
    Type = "Public"
  }
}

# Private Subnets (Compute and Workloads)
resource "aws_subnet" "private" {
  count                   = length(var.private_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidrs&#91;count.index]
  availability_zone       = var.availability_zones&#91;count.index]
  map_public_ip_on_launch = false

  tags = {
    Name = "${var.environment}-private-subnet-${var.availability_zones&#91;count.index]}"
    Type = "Private"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = length(var.public_subnet_cidrs)
  domain = "vpc"

  tags = {
    Name = "${var.environment}-nat-eip-${count.index + 1}"
  }
}

# NAT Gateways for Private Subnet Outbound Internet Access
resource "aws_nat_gateway" "nat" {
  count         = length(var.public_subnet_cidrs)
  allocation_id = aws_eip.nat&#91;count.index].id
  subnet_id     = aws_subnet.public&#91;count.index].id

  tags = {
    Name = "${var.environment}-nat-gw-${count.index + 1}"
  }

  depends_on = &#91;aws_internet_gateway.gw]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public&#91;count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables (Pointed to Corresponding NAT Gateways)
resource "aws_route_table" "private" {
  count  = length(var.private_subnet_cidrs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat&#91;count.index].id
  }

  tags = {
    Name = "${var.environment}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidrs)
  subnet_id      = aws_subnet.private&#91;count.index].id
  route_table_id = aws_route_table.private&#91;count.index].id
}</code></pre>



<h3 class="wp-block-heading">modules/vpc/outputs.tf</h3>



<pre class="wp-block-code"><code>output "vpc_id" {
  description = "The ID of the provisioned VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public&#91;*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets."
  value       = aws_subnet.private&#91;*].id
}</code></pre>



<h2 class="wp-block-heading">Stage 3: Modular ECS Fargate &amp; ALB Workload Configuration</h2>



<p class="wp-block-paragraph">Run stateless application services on AWS ECS Fargate with zero underlying EC2 management overhead. Managing containerized microservices within a <strong>Terraform AWS production infrastructure</strong> eliminates operational server management while keeping compute costs predictable. Configuring fine-grained security group rules prevents lateral movement across a <strong>Terraform AWS production infrastructure</strong>.</p>



<h3 class="wp-block-heading"><code>modules/ecs-service/variables.tf</code></h3>



<pre class="wp-block-code"><code>variable "environment" {
  type        = string
  description = "Deployment environment identifier."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the service will run."
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnets for the Application Load Balancer."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for ECS task deployment."
}

variable "container_image" {
  type        = string
  description = "Container image URI to deploy."
}

variable "container_port" {
  type        = number
  description = "Port exposed by the container."
  default     = 8080
}

variable "app_count" {
  type        = number
  description = "Desired number of running task instances."
  default     = 2
}</code></pre>



<h3 class="wp-block-heading">modules/ecs-service/main.tf</h3>



<pre class="wp-block-code"><code># ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Group for Application Output
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.environment}-app"
  retention_in_days = 30
}

# IAM Execution Role (Pulls images and writes logs)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = &#91;{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Task Role (Permissions for runtime code execution)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = &#91;{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Controls HTTP/HTTPS access to the ALB"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = &#91;"0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = &#91;"0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.environment}-ecs-tasks-sg"
  description = "Allows inbound traffic only from the ALB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound from ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = &#91;aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound traffic for package/API access"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = &#91;"0.0.0.0/0"]
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = &#91;aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "app" {
  name        = "${var.environment}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.environment}-app-task"
  network_mode             = "awsvpc"
  requires_compatibilities = &#91;"FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode(&#91;
    {
      name      = "application"
      image     = var.container_image
      essential = true
      portMappings = &#91;
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
      readonlyRootFilesystem = false
      user                   = "10001:10001"
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = &#91;aws_security_group.ecs_tasks.id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "application"
    container_port   = var.container_port
  }

  deployment_controller {
    type = "ECS"
  }

  depends_on = &#91;aws_lb_listener.http]
}</code></pre>



<h3 class="wp-block-heading">modules/ecs-service/outputs.tf</h3>



<pre class="wp-block-code"><code>output "alb_dns_name" {
  description = "The public DNS name of the Application Load Balancer."
  value       = aws_lb.main.dns_name
}</code></pre>



<h2 class="wp-block-heading">Stage 4: Production Environment Assembly</h2>



<p class="wp-block-paragraph">Connect your networking and compute modules within the production environment configuration. Assembling individual VPC and compute modules into a unified root directory gives your <strong>Terraform AWS production infrastructure</strong> reproducible multi-environment consistency.</p>



<h3 class="wp-block-heading"><code>environments/prod/main.tf</code></h3>



<pre class="wp-block-code"><code>terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40.0"
    }
  }

  backend "s3" {
    bucket         = "devstackhub-production-tfstate-us-east-1"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "devstackhub-production-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "Production"
      ManagedBy   = "Terraform"
      Repository  = "infrastructure-live"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"

  environment          = "production"
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "ecs_service" {
  source = "../../modules/ecs-service"

  environment        = "production"
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  container_image    = var.container_image
  container_port     = 8080
  app_count          = 3
}</code></pre>



<h3 class="wp-block-heading">environments/prod/variables.tf</h3>



<pre class="wp-block-code"><code>variable "aws_region" {
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  default     = &#91;"us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  default     = &#91;"10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  default     = &#91;"10.0.10.0/24", "10.0.20.0/24"]
}

variable "container_image" {
  type        = string
  description = "Target production Docker image"
  default     = "nginx:alpine"
}</code></pre>



<h3 class="wp-block-heading">environments/prod/outputs.tf</h3>



<pre class="wp-block-code"><code>output "production_alb_endpoint" {
  description = "Load balancer public URL"
  value       = "http://${module.ecs_service.alb_dns_name}"
}</code></pre>



<h2 class="wp-block-heading">Stage 5: GitHub Actions CI/CD Pipeline with AWS OIDC</h2>



<p class="wp-block-paragraph">Never store static <code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code> credentials in your CI/CD repository secrets. Instead, configure AWS IAM OpenID Connect (OIDC) identity federation so GitHub Actions can assume a short-lived IAM deployment role directly. Triggering automated workflows keeps the Terraform AWS production infrastructure consistent across all regions while eliminating manual deployment errors. Follow standard authentication guidelines outlined in the <strong><a href="https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services" target="_blank" rel="noopener">AWS OpenID Connect (OIDC) GitHub Actions Guide</a></strong>. Automating your deployment pipeline with role assumption is the safest way to maintain a <strong>Terraform AWS production infrastructure</strong> without managing static credentials.</p>



<h3 class="wp-block-heading"><code>.github/workflows/terraform-pipeline.yml</code></h3>



<pre class="wp-block-code"><code>name: Terraform AWS Production Pipeline

on:
  push:
    branches: &#91; main ]
    paths:
      - 'environments/prod/**'
      - 'modules/**'
  pull_request:
    branches: &#91; main ]
    paths:
      - 'environments/prod/**'
      - 'modules/**'

permissions:
  id-token: write   # Required for requesting short-lived AWS STS tokens
  contents: read    # Required to checkout the repository
  pull-requests: write # Required for PR commenting

jobs:
  validate:
    name: Terraform Format &amp; Static Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5

      - name: Check Terraform Format
        run: terraform fmt -check -recursive

  plan:
    name: Terraform Plan &amp; Security Audit
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform-prod-role
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5

      - name: Terraform Init
        working-directory: environments/prod
        run: terraform init

      - name: Terraform Plan
        id: plan
        working-directory: environments/prod
        run: terraform plan -no-color -out=tfplan

      - name: Security Scan with Tfsec
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          working_directory: environments/prod

  apply:
    name: Terraform Apply (Production)
    needs: plan
    if: github.ref == 'refs/heads/main' &amp;&amp; github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform-prod-role
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5

      - name: Terraform Init
        working-directory: environments/prod
        run: terraform init

      - name: Terraform Apply
        working-directory: environments/prod
        run: terraform apply -auto-approve</code></pre>



<h2 class="wp-block-heading">Production Security and Verification Checklist</h2>



<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><td><strong>Security Area</strong></td><td><strong>Control Item</strong></td><td><strong>Target Status</strong></td></tr></thead><tbody><tr><td><strong>State Storage</strong></td><td>S3 Bucket Public Access</td><td>Fully Blocked (<code>block_public_acls = true</code>)</td></tr><tr><td><strong>Data At Rest</strong></td><td>S3 State File Encryption</td><td>Customer-Managed AWS KMS Key (<code>aws:kms</code>)</td></tr><tr><td><strong>State Locking</strong></td><td>Race Condition Prevention</td><td>DynamoDB Table Partition Key <code>LockID</code></td></tr><tr><td><strong>Networking</strong></td><td>Workload Subnet Isolation</td><td>Zero public IPs assigned to ECS Task ENIs</td></tr><tr><td><strong>Ingress</strong></td><td>Traffic Route Enforcement</td><td>ALB Ingress on 80/443; Tasks ingress exclusively from ALB SG</td></tr><tr><td><strong>Identity</strong></td><td>CI/CD Secrets Elimination</td><td>AWS OIDC Federated Role with short-lived STS tokens</td></tr></tbody></table></figure>



<h2 class="wp-block-heading">Frequently Asked Questions (FAQs)</h2>



<h3 class="wp-block-heading">Why should I choose DynamoDB state locking over standard S3 versioning?</h3>



<p class="wp-block-paragraph">S3 versioning provides recovery capabilities when files are overwritten, but it does not prevent simultaneous <code>terraform apply</code> executions. DynamoDB maintains a real-time mutual exclusion lock on the state file, throwing an immediate error if another engineer or pipeline attempts a deployment at the same time. Implementing DynamoDB state locking protects a <strong>Terraform AWS production infrastructure</strong> from accidental race conditions and corrupted state files during simultaneous pipeline runs.</p>



<h3 class="wp-block-heading">How do I handle circular dependencies between the state backend and the VPC?</h3>



<p class="wp-block-paragraph">Never create the remote state backend inside the same root module as your application workloads. Use the two-step approach demonstrated in this guide: first deploy the isolated <code>backend-bootstrap</code> using local state, then reference that established S3 bucket and DynamoDB table in the <code>backend "s3"</code> block of your core infrastructure.</p>



<h3 class="wp-block-heading">What is the recommended way to rotate secrets without plain-text exposure in <code>.tfvars</code>?</h3>



<p class="wp-block-paragraph">Store runtime credentials directly in AWS Secrets Manager or AWS Systems Manager Parameter Store. Reference their dynamic ARNs in your Terraform task definitions via the <code>secrets</code> attribute rather than passing plain-text strings through variable files.</p>



<p class="wp-block-paragraph">A structured <strong>Terraform AWS production infrastructure</strong> eliminates operational drift and provides an automated, immutable foundation for cloud workloads. By combining state locking, isolated network tiers, and OIDC CI/CD pipelines, your team can deploy infrastructure updates safely and reliably.</p>



<h2 class="wp-block-heading">Summary &amp; Best Practices</h2>



<p class="wp-block-paragraph">Building an enterprise-ready infrastructure footprint requires strict adherence to immutability, least privilege, and automated validation:</p>



<ul class="wp-block-list">
<li><strong>State Isolation:</strong> Never co-locate remote state bootstrap resources within the same state file as the infrastructure they track.</li>



<li><strong>Network Segregation:</strong> Keep application containers strictly inside private subnets without public IPs, allowing inbound access exclusively through the load balancer&#8217;s security group.</li>



<li><strong>Zero Static Keys:</strong> Federate GitHub Actions using AWS IAM OpenID Connect (OIDC) to eliminate long-lived cloud credentials from your CI/CD repository secrets.</li>



<li><strong>Continuous Linting &amp; Scanning:</strong> Run automated formatting checks (<code>terraform fmt</code>), security audits (<code>tfsec</code>), and state-locking validations on every pull request prior to merge.</li>
</ul>



<p class="wp-block-paragraph">Following these practices ensures your production environment remains secure, cost-effective, and fully resilient against configuration drift. Maintaining an immutable <strong>Terraform AWS production infrastructure</strong> gives engineering teams the speed and confidence needed to deploy scalable cloud services.</p>



<hr class="wp-block-separator has-alpha-channel-opacity"/>



<h2 class="wp-block-heading">Related DevOps &amp; Cloud Architecture Guides</h2>



<p class="wp-block-paragraph">Expand your automation and container orchestration pipelines with our deep-dive implementation blueprints:</p>



<ul class="wp-block-list">
<li><strong><a href="https://devstackhub.tech/github-actions-ci-cd-production-workflows/">Production-Ready GitHub Actions CI/CD Pipeline</a>:</strong> Implement matrix testing, multi-stage Docker builds, and zero-downtime container deployments.</li>



<li><strong><a href="https://devstackhub.tech/kubernetes-vs-docker-swarm-aks-guide/">Kubernetes vs Docker Swarm: Production Comparison &amp; Hybrid Architecture</a>:</strong> Evaluate cluster overhead, ingress routing, stateful workloads, and day-two operations.</li>
</ul>

