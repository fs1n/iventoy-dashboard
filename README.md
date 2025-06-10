
# Iventoy Dashboard

A overview for your iVentoy-Instance. With this overview, you can view all available ISO-files in Iventoy, Download them, show ISO-informations and view the inside of every ISO.

## Features

- Overview of all ISOs
- View the inside of any ISO
- Download every ISO
- Show ISO-informations

## Installation

> [!IMPORTANT]  
> Install the iVentoy-Dashboard on the same server where you installed the iVentoy-Server

> [!IMPORTANT]
> Replace ```your\.iventoy\.ip\.address``` with your iVentoy-Server ip

```bash
sudo apt update -y
sudo apt install nginx git -y
sudo systemctl enable nginx
sudo systemctl start nginx
sudo rm /etc/nginx/sites-available/default
sudo rm /etc/nginx/sites-enabled/default
sudo rm -r /var/www/html/*
git clone https://github.com/craeckor/iventoy-dashboard.git
cd iventoy-dashboard
sudo cp default.conf /etc/nginx/conf.d
sudo cp index.html /var/www/html
sudo cp upload-iso.php /var/www/html
sudo cp favicon.ico /var/www/html
sudo cp -R assets /var/www/html
sudo chown -R www-data:www-data /var/www
sudo sed -i 's/1\.2\.3\.4/your\.iventoy\.ip\.address/g' /etc/nginx/conf.d/default.conf # Replace your\.iventoy\.ip\.address with Ex. 10\.50\.0\.35
sudo systemctl restart nginx
```

## Screenshots

Screenshot 1:

![screenshot-1](images/screenshot-1.png)

Screenshot 2:

![screenshot-2](images/screenshot-2.png)

Screenshot 3:

![screenshot-3](images/screenshot-3.png)

## Used Libraries

- jQuery 3.7.1 - [jquery.com](https://jquery.com)
- Bootstrap 5.3.3 - [getbootstrap.com](https://getbootstrap.com)
- Font Awesome 6.7.2 - [fontawesome.com](https://fontawesome.com)

## License

[GNU GENERAL PUBLIC LICENSE 3](LICENSE)

