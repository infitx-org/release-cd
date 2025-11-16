#! /bin/bash

ttyd -a -O -W -m 5 -c ${K9S_USER}:${K9S_PASS} bash ./tui.sh
