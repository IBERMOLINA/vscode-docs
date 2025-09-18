#!/bin/bash

# Security Check Script for LifeOS
# This script performs basic security checks before deployment

echo "🔒 LifeOS Security Check"
echo "========================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example to .env and configure it."
    exit 1
else
    echo "✅ .env file found"
fi

# Check for default passwords in .env
if grep -q "changeme" .env 2>/dev/null; then
    echo "❌ Default passwords found in .env file! Please change all 'changeme' values."
    exit 1
else
    echo "✅ No default passwords found in .env"
fi

# Check npm dependencies for vulnerabilities
echo "🔍 Checking npm dependencies..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "❌ npm audit found vulnerabilities!"
    exit 1
else
    echo "✅ No npm vulnerabilities found"
fi

# Check Docker security (if Docker is available)
if command -v docker &> /dev/null; then
    echo "🔍 Checking Docker image security..."
    # Build the image first
    docker build -t lifeos-security-check . > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        # Check if docker scan is available
        if docker scan --help &> /dev/null; then
            docker scan lifeos-security-check
        else
            echo "⚠️  Docker scan not available, skipping image security check"
        fi
        # Clean up
        docker rmi lifeos-security-check > /dev/null 2>&1
    else
        echo "⚠️  Could not build Docker image for security check"
    fi
else
    echo "⚠️  Docker not available, skipping Docker security check"
fi

# Check file permissions
echo "🔍 Checking file permissions..."
if [ -f .env ]; then
    PERM=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null)
    if [[ "$PERM" == *"600" ]] || [[ "$PERM" == *"0600" ]]; then
        echo "✅ .env file has secure permissions"
    else
        echo "⚠️  .env file permissions should be 600 (chmod 600 .env)"
    fi
fi

# Check for sensitive files that shouldn't be committed
SENSITIVE_FILES=(".env" "*.pem" "*.key" "*.p12" "*.pfx")
echo "🔍 Checking for sensitive files in git..."
for pattern in "${SENSITIVE_FILES[@]}"; do
    if git ls-files "$pattern" 2>/dev/null | grep -q .; then
        echo "❌ Sensitive files found in git: $(git ls-files "$pattern")"
        echo "   These files should be in .gitignore and removed from git history"
        exit 1
    fi
done
echo "✅ No sensitive files found in git"

# Check SSL certificate configuration (if nginx is used)
if [ -d "ssl" ]; then
    echo "🔍 Checking SSL certificates..."
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        echo "✅ SSL certificates found"
        # Check certificate expiration
        if command -v openssl &> /dev/null; then
            EXPIRY=$(openssl x509 -enddate -noout -in ssl/cert.pem 2>/dev/null | cut -d= -f2)
            if [ $? -eq 0 ]; then
                echo "📅 SSL certificate expires: $EXPIRY"
            fi
        fi
    else
        echo "⚠️  SSL certificates not found in ssl/ directory"
    fi
fi

echo ""
echo "🎉 Security check completed!"
echo ""
echo "📋 Deployment Checklist:"
echo "  □ Update all passwords in .env file"
echo "  □ Configure ALLOWED_ORIGINS for your domain"
echo "  □ Set up SSL/TLS certificates"
echo "  □ Configure firewall rules"
echo "  □ Set up monitoring and logging"
echo "  □ Test backup and recovery procedures"
echo ""
echo "For more information, see SECURITY.md"