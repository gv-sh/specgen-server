#!/bin/bash

# Exit on any error
set -e

# Update and install dependencies
apt update && apt upgrade -y
apt install -y nginx nodejs npm certbot python3-certbot-nginx git

# Install Node.js 16.x (or update to a newer version if needed)
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Set up project directory
mkdir -p /var/www/specgen
cd /var/www/specgen

# Clone repositories
git clone https://github.com/yourusername/specgen-server.git server
git clone https://github.com/yourusername/specgen-admin.git admin
git clone https://github.com/yourusername/specgen-user.git user

# Set up server
cd /var/www/specgen/server
npm install
cp .env.example .env
echo "Please edit the .env file with your OpenAI API key before proceeding"
read -p "Press Enter to continue..."
nano .env

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [
    {
      name: "specgen-server",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
EOL

# Start the server with PM2
pm2 start ecosystem.config.js

# Set up admin UI
cd /var/www/specgen/admin
npm install
npm run build

# Set up user UI
cd /var/www/specgen/user
npm install
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/specgen << 'EOL'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin UI
    location /admin/ {
        alias /var/www/specgen/admin/build/;
        try_files $uri $uri/ /admin/index.html;
    }

    # User UI
    location / {
        root /var/www/specgen/user/build;
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/x-javascript
        application/xml
        application/xml+rss
        text/css
        text/javascript
        text/plain
        text/xml;
}
EOL

# Enable the site and restart Nginx
ln -s /etc/nginx/sites-available/specgen /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Ask for domain information
read -p "Do you want to set up SSL with Let's Encrypt? (y/n): " setup_ssl
if [ "$setup_ssl" = "y" ]; then
    read -p "Enter your domain name (e.g., specgen.example.com): " domain_name
    # Update Nginx config with the provided domain
    sed -i "s/your-domain.com/$domain_name/g" /etc/nginx/sites-available/specgen
    sed -i "s/www.your-domain.com/www.$domain_name/g" /etc/nginx/sites-available/specgen
    
    # Reload Nginx with the new domain
    systemctl reload nginx
    
    # Set up SSL with Let's Encrypt
    certbot --nginx -d $domain_name -d www.$domain_name
fi

# Configure firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Set up PM2 to start on boot
pm2 startup
pm2 save

# Initialize the database with sample data
cd /var/www/specgen/server
npm run init-db

echo "==============================================="
echo "Deployment complete!"
if [ "$setup_ssl" = "y" ]; then
    echo "Your application is now available at https://$domain_name"
    echo "Admin interface is at https://$domain_name/admin/"
else
    echo "Your application is available at http://your-server-ip"
    echo "Admin interface is at http://your-server-ip/admin/"
fi
echo "==============================================="