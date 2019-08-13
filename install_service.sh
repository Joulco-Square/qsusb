cp ./qsusb.service /lib/systemd/system/
chmod 644 /lib/systemd/system/qsusb.service
chmod +x ./qsusb*

systemctl daemon-reload
systemctl enable qsusb.service
systemctl start qsusb.service