# InstaSync
Code responsible for running instasync.com

If you're really interested in getting this running here's some hints.

* install node.js/npm etc.
* install mysql
* create database instasynch
* import schema/schema.sql into your DB
* clone repo
* run npm install
* cp node_modules/instasync/config.sample node_modules/config
* edit node_modules/instasync/config/index.js config file
* cd to web, start bin/www
* cd chat, start chat, and start clients

Web is the main web server, chat/chat.js is the core chat server. chat/clients.js is the socket.io layer that communicates with the chat core. There's a lot of moving pieces and I never had the time to make all the changes I wanted. 

It might help to check out mewte/is_chat and mewte/InstaSync-WebServer as those two repos were combined into this repo for easy management.

Feel free to make changes and open pull request.
