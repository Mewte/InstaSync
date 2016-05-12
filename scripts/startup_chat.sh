###RENAME TO /home/nodejs/startup.sh

#iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port $
ulimit -n 32000
cd /home/nodejs/is_chat/exec
sudo -H -u nodejs pm2 start chat.js
exit 0