#!/bin/bash

/etc/init.d/ssh start && \
su smashtest -c "cd; . .bashrc; webdriver-manager start"
