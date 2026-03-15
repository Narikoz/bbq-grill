# ── PHP 8.2 + Apache + extensions ──────────────────────────
FROM php:8.2-apache

# Extensions required by the project
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable mod_rewrite for .htaccess URL rewriting
RUN a2enmod rewrite headers

# Apache: allow .htaccess overrides, set document root to /var/www/html
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html|g' \
        /etc/apache2/sites-available/000-default.conf && \
    sed -i 's|<Directory /var/www/>|<Directory /var/www/html/>|g' \
        /etc/apache2/apache2.conf && \
    sed -i 's/AllowOverride None/AllowOverride All/g' \
        /etc/apache2/apache2.conf

# Increase PHP limits for the app
RUN echo "upload_max_filesize = 20M"  >> /usr/local/etc/php/conf.d/app.ini && \
    echo "post_max_size = 20M"        >> /usr/local/etc/php/conf.d/app.ini && \
    echo "memory_limit = 256M"        >> /usr/local/etc/php/conf.d/app.ini && \
    echo "display_errors = On"        >> /usr/local/etc/php/conf.d/app.ini && \
    echo "error_reporting = E_ALL"    >> /usr/local/etc/php/conf.d/app.ini && \
    echo "date.timezone = Asia/Bangkok" >> /usr/local/etc/php/conf.d/app.ini

EXPOSE 80
