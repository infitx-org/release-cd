#! /bin/bash

# if .bashrc is missing from the home directory when volume is mounted, copy all files from /etc/skel for the current user
USER=$(whoami)
if [ ! -f /home/"${USER}"/.bashrc ]; then
    cp -r /etc/skel/. /home/"${USER}"/
    chown -R "${USER}":"${USER}" /home/"${USER}"/
fi

ttyd -a -O -W -m 5 -p 8080 -c ${DEV_USER}:${DEV_PASS} bash ./tui.sh
