#!/bin/bash

. /root/.bashrc # Import the Node path values
/etc/init.d/ssh start && \
webdriver-manager start
