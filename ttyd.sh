#! /bin/bash

ttyd -a -O -W -m 5 -p 80 -c ${DEV_USER}:${DEV_PASS} bash ./tui.sh
