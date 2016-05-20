# InstaSync
Code responsible for running instasync.com

FAQ

####Why u do this mewte?
I created InstaSync in 2013 and since then it's been a rollercoast of a ride. I've learned so much from running this site and started a career in web development because of you guys.

Unfortunately, I've considered quiting multiple times. Running this website has been extremely taxing on my life. I've bounced back and forth over and over, but after today's domain compromise, I figure the timing is just right to throw in the towel.

The only thing compromised was the DNS server and the domain name was transfered to another user. As a safety measure, I've dumped all the servers and destroyed the database. All your usernames/emails/passwords have been purged and removed. No remaining backups exist.

Again, no user data was compromised.

####What are you going to do now?
I'm going to continue my career in software development. Who knows, maybe you'll end up using my next product.

####Ok cool enough about you, how do I get instasync running so I can make clone number 47 but this time it'll be different?

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

####In Closing

If you use this project to build anything cool, or maybe it inspires you to follow your own dreams feel free share your story with me. 
If you really need to rant, you can usually find me on Steam:
http://steamcommunity.com/id/iammewte/
