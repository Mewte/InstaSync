#rename to ../startup.sh

ulimit -n 32000
cd /home/nodejs/InstaSync-WebServer/
sudo -H -u nodejs pm2 start bin/www
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080
exit 0