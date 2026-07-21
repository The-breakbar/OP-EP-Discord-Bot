```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin bot
sudo mkdir -p /opt/discord-bot
sudo chown bot:bot /opt/discord-bot

sudo -u bot git clone https://github.com/The-breakbar/OP-EP-Discord-Bot.git /opt/discord-bot
sudo -u bot bash -c "cd /opt/discord-bot && npm ci --omit=dev"
```

```bash
sudo -u bot nano /opt/discord-bot/.env
sudo -u bot nano /opt/discord-bot/word_filter.txt
```

```bash
sudo cp /opt/discord-bot/deploy/discord-bot.service        /etc/systemd/system/
sudo cp /opt/discord-bot/deploy/discord-bot-deploy.service /etc/systemd/system/
sudo cp /opt/discord-bot/deploy/discord-bot-deploy.timer   /etc/systemd/system/
sudo chmod +x /opt/discord-bot/deploy/deploy.sh

sudo systemctl daemon-reload
sudo systemctl enable --now discord-bot.service
sudo systemctl enable --now discord-bot-deploy.timer
```


```bash
systemctl status discord-bot
journalctl -u discord-bot -f

systemctl list-timers discord-bot-deploy.timer
journalctl -u discord-bot-deploy -f

sudo systemctl start discord-bot-deploy.service
```

```bash
sudo systemctl stop discord-bot
sudo systemctl stop discord-bot-deploy.timer

sudo systemctl start discord-bot
sudo systemctl start discord-bot-deploy.timer
```
