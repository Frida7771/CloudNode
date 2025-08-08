packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, <2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "ami-0866a3c8686eaeeba"
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = "subnet-01dfc6d1a4045e874"
}

variable "DB_PASSWORD" {
  type    = string
  default = "#Etnlhy1396917302"
}

variable "DB_USER" {
  type    = string
  default = "frida"
}

variable "DB_NAME" {
  type    = string
  default = "web"
}

source "amazon-ebs" "ubuntu-ami" {
  region          = var.aws_region
  source_ami      = var.source_ami
  instance_type   = "t2.small"
  ssh_username    = var.ssh_username
  ami_name        = "custom-ubuntu-{{timestamp}}"
  vpc_id = "vpc-080d7f760ed7c517a"
  subnet_id       = var.subnet_id
  ami_description = "AMI for Frida's Node.js healthweb"
  ami_regions = [
    "us-east-1",
  ]

  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type           = "gp2"
  }
}

build {
  sources = [
    "source.amazon-ebs.ubuntu-ami"
  ]

  provisioner "shell" {
    environment_vars = [
      "DEBIAN_FRONTEND=noninteractive",
      "CHECKPOINT_DISABLE=1"
    ]
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y curl unzip" # Install unzip here
    ]
  }

  provisioner "file" {
    source      = "./cloudwatch-config.json"
    destination = "/tmp/cloudwatch-config.json"
  }

  provisioner "shell" {
    scripts = [
      "scripts/setup_cloudWatch.sh",
    ]
  }

  provisioner "shell" {
    environment_vars = [
      "DB_PASSWORD=${var.DB_PASSWORD}",
      "DB_USER=${var.DB_USER}",
      "DB_NAME=${var.DB_NAME}"
    ]
    scripts = [
      "scripts/install_nodejs.sh",
    ]
  }


  provisioner "file" {
    source      = "./healthweb.service"
    destination = "/tmp/healthweb.service"
  }

  provisioner "shell" {
    scripts = [
      "scripts/healthwebScript.sh",
      "scripts/userScript.sh",
      "scripts/serviceScript.sh"
    ]
  }
}
