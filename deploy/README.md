# SpecGen Deployment Guide

This guide explains how to deploy the complete SpecGen application on a Digital Ocean Ubuntu droplet.

## Prerequisites

- Digital Ocean account
- Domain name (optional, but recommended)
- SSH key set up in Digital Ocean

## Deployment Steps

### 1. Create a Droplet

1. Log into Digital Ocean
2. Create a new droplet with:
   - Ubuntu 22.04 LTS
   - Basic plan ($5-$10/month depending on your needs)
   - Choose a datacenter region close to your users
   - Add your SSH key
   - Choose a hostname (e.g., `specgen-app`)

### 2. Deploy the Application

1. SSH into your new droplet:
   ```bash
   ssh root@your-droplet-ip
   ```

2. Create a directory for the deployment files:
   ```bash
   mkdir -p ~/deploy
   cd ~/deploy
   ```

3. Upload the deployment files to this directory:
   - `deploy.sh`
   - `nginx-specgen.conf`
   - `ecosystem.config.js`

4. Make the deployment script executable and run it:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

5. Follow the prompts to complete the setup:
   - Enter your OpenAI API key when prompted
   - Configure your domain name for SSL if desired

## Maintenance

### Updating the Application

```bash
cd /var/www/specgen/server
git pull
npm install
pm2 restart specgen-server

# For the Admin UI
cd /var/www/specgen/admin
git pull
npm install
npm run build

# For the User UI
cd /var/www/specgen/user
git pull
npm install
npm run build
```

### Monitoring

- View logs:
  ```bash
  pm2 logs specgen-server
  ```

- Check server status:
  ```bash
  pm2 status
  ```

- Monitor Nginx:
  ```bash
  systemctl status nginx
  ```

### Backup

Backup the database file regularly:
```bash
cp /var/www/specgen/server/data/database.json /var/backups/specgen-$(date +%Y%m%d).json
```

## Troubleshooting

- **API not responding**: Check the PM2 logs with `pm2 logs specgen-server`
- **UI not loading**: Verify Nginx configuration and restart with `systemctl restart nginx`
- **SSL issues**: Run `certbot --nginx` to reconfigure SSL