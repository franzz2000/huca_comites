#!/bin/bash
# simple-deploy.sh

set -e  # Salir si hay error

echo "🚀 Iniciando deploy..."

# Build
echo "📦 Building aplicación..."
npm run build

# Backup
echo "💾 Creando backup..."
if [ -d "/var/www/html/custom-mpages/huca_comites" ]; then
    sudo mv /var/www/html/custom-mpages/huca_comites /var/www/html/custom-mpages/huca_comites.backup.$(date +%Y%m%d_%H%M%S)
fi

# Deploy
echo "🚚 Copiando archivos..."
sudo mkdir -p /var/www/html/custom-mpages/huca_comites
sudo cp -r dist/* /var/www/html/custom-mpages/huca_comites/

# Permisos
sudo chown -R www-data:www-data /var/www/html/custom-mpages/huca_comites
sudo chmod -R 755 /var/www/html/custom-mpages/huca_comites

echo "✅ Deploy completado!"
