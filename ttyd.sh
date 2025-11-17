#! /bin/bash

ttyd -a -O -W -m 5 -p 8080 -c ${DEV_USER}:${DEV_PASS} bash ./tui.sh
