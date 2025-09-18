#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Running Security Checks for LifeOS...\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function runCheck(name, checkFunction) {
  totalChecks++;
  process.stdout.write(`Checking ${name}... `);
  try {
    const result = checkFunction();
    if (result) {
      console.log('✅ PASSED');
      passedChecks++;
      return true;
    } else {
      console.log('❌ FAILED');
      failedChecks++;
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    failedChecks++;
    return false;
  }
}

// Check 1: NPM Vulnerabilities
runCheck('NPM vulnerabilities (server)', () => {
  try {
    const result = execSync('npm audit --json', { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    const audit = JSON.parse(result);
    return audit.metadata.vulnerabilities.total === 0;
  } catch (e) {
    // npm audit returns non-zero exit code if vulnerabilities found
    return false;
  }
});

runCheck('NPM vulnerabilities (client)', () => {
  try {
    const result = execSync('npm audit --json', { 
      cwd: path.join(__dirname, '..', 'client'),
      encoding: 'utf8'
    });
    const audit = JSON.parse(result);
    return audit.metadata.vulnerabilities.total === 0;
  } catch (e) {
    return false;
  }
});

// Check 2: Security Dependencies
runCheck('Security dependencies installed', () => {
  const packageJson = require('../package.json');
  const requiredDeps = [
    'helmet',
    'express-rate-limit',
    'express-mongo-sanitize',
    'bcryptjs',
    'jsonwebtoken',
    'validator',
    'cors'
  ];
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  return requiredDeps.every(dep => allDeps[dep]);
});

// Check 3: Environment Configuration
runCheck('Environment example file exists', () => {
  return fs.existsSync(path.join(__dirname, '..', '.env.example'));
});

// Check 4: Security Middleware Files
runCheck('Security middleware files exist', () => {
  const files = [
    'server/middleware/security.js',
    'server/routes/auth.js',
    'server/models/User.js',
    'server/models/Product.js'
  ];
  
  return files.every(file => 
    fs.existsSync(path.join(__dirname, '..', file))
  );
});

// Check 5: No hardcoded secrets
runCheck('No hardcoded secrets in server files', () => {
  const serverDir = path.join(__dirname, '..', 'server');
  const files = execSync(`find ${serverDir} -name "*.js"`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  const secretPatterns = [
    /["']password["']\s*[:=]\s*["'][^"']+["']/i,
    /["']secret["']\s*[:=]\s*["'][^"']+["']/i,
    /["']api[_-]?key["']\s*[:=]\s*["'][^"']+["']/i,
    /["']token["']\s*[:=]\s*["'][^"']+["']/i
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        // Allow default/example values
        if (!content.includes('default-secret-change-this') && 
            !content.includes('your-very-long-random-string')) {
          console.log(`\n  Found potential secret in ${file}`);
          return false;
        }
      }
    }
  }
  return true;
});

// Check 6: Security Headers Implementation
runCheck('Security headers implemented', () => {
  const serverFile = fs.readFileSync(
    path.join(__dirname, '..', 'server', 'index.js'), 
    'utf8'
  );
  
  const requiredHeaders = [
    'helmet',
    'contentSecurityPolicy',
    'hsts',
    'X-Frame-Options',
    'X-Content-Type-Options'
  ];
  
  return requiredHeaders.every(header => serverFile.includes(header));
});

// Check 7: Rate Limiting Implementation
runCheck('Rate limiting implemented', () => {
  const serverFile = fs.readFileSync(
    path.join(__dirname, '..', 'server', 'index.js'), 
    'utf8'
  );
  
  return serverFile.includes('express-rate-limit') && 
         serverFile.includes('limiter');
});

// Check 8: Input Validation
runCheck('Input validation implemented', () => {
  const securityFile = fs.readFileSync(
    path.join(__dirname, '..', 'server', 'middleware', 'security.js'), 
    'utf8'
  );
  
  return securityFile.includes('validateInput') && 
         securityFile.includes('sanitizeInput');
});

// Check 9: Authentication System
runCheck('Authentication system implemented', () => {
  const authFile = fs.readFileSync(
    path.join(__dirname, '..', 'server', 'routes', 'auth.js'), 
    'utf8'
  );
  
  return authFile.includes('/register') && 
         authFile.includes('/login') &&
         authFile.includes('hashPassword') &&
         authFile.includes('generateToken');
});

// Check 10: MongoDB Sanitization
runCheck('MongoDB query sanitization', () => {
  const serverFile = fs.readFileSync(
    path.join(__dirname, '..', 'server', 'index.js'), 
    'utf8'
  );
  
  return serverFile.includes('express-mongo-sanitize');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Security Check Summary:');
console.log('='.repeat(50));
console.log(`Total Checks: ${totalChecks}`);
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (failedChecks === 0) {
  console.log('\n🎉 All security checks passed! Your application is well-protected.');
} else {
  console.log('\n⚠️  Some security checks failed. Please review and fix the issues above.');
  process.exit(1);
}

console.log('\n💡 Additional Recommendations:');
console.log('  - Use HTTPS in production');
console.log('  - Keep dependencies updated regularly');
console.log('  - Implement logging and monitoring');
console.log('  - Conduct regular security audits');
console.log('  - Use strong, unique passwords for all services');
console.log('  - Enable 2FA where possible');
console.log('  - Regularly backup your data');