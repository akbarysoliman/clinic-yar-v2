\# 🚀 راهنمای نصب و راه‌اندازی کلینیک‌یار روی سرور



این سند شامل تمام مراحل لازم برای راه‌اندازی نرم‌افزار روی یک سرور Ubuntu جدید است.



\## پیش‌نیازهای سرور



\- \*\*سیستم‌عامل:\*\* Ubuntu 22.04 LTS

\- \*\*CPU:\*\* حداقل ۴ هسته

\- \*\*RAM:\*\* حداقل ۸ گیگابایت

\- \*\*دیسک:\*\* حداقل ۱۰۰ گیگابایت SSD



\## ۱. نصب پیش‌نیازها



```bash

\# آپدیت سیستم

sudo apt update \&\& sudo apt upgrade -y



\# نصب Node.js 20

curl -fsSL https://deb.nodesource.com/setup\_20.x | sudo -E bash -

sudo apt install -y nodejs



\# نصب PostgreSQL

sudo apt install -y postgresql postgresql-contrib



\# نصب MySQL

sudo apt install -y mysql-server



\# نصب Nginx

sudo apt install -y nginx



\# نصب PM2

sudo npm install -g pm2



\# نصب Certbot (برای SSL)

sudo apt install -y certbot python3-certbot-nginx

