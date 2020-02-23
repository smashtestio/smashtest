FROM debian:buster
WORKDIR /root

RUN apt-get -y update && \
	apt-get -y install npm curl openjdk-11-jre openjdk-11-jdk procps openssh-server bash  libdbus-glib-1-2 && \
	curl -o chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
	apt-get -y install -f ./chrome.deb && \
	printf "\ndeb http://downloads.sourceforge.net/project/ubuntuzilla/mozilla/apt all main" >> /etc/apt/sources.list && \
	apt-key adv --keyserver keyserver.ubuntu.com --recv-keys CCC158AFC1289A29 && \
	apt-get update && \
	apt-get -y install firefox-mozilla-build && \
	/usr/sbin/useradd -c SmashTest -s /bin/bash -d /home/smashtest smashtest && \
	mkdir /home/smashtest && \
	chown -R smashtest:smashtest /home/smashtest && \
	curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh > install.sh && \
	echo '972c2b83fb0db7c3a1481bc982db7b1bfe7deae620514b94598b061b6a864baf  install.sh' | /usr/bin/sha256sum -c - && \
	cp ./install.sh /home/smashtest/install.sh && \
	chmod 755 /home/smashtest/install.sh && \
	su smashtest -c "cd /home/smashtest && \
	touch .bashrc && \
	bash ./install.sh && \
	. .bashrc && \
	nvm install node && \
	npm install -g webdriver-manager && \
	webdriver-manager update && \
	npm install -g smashtest && \
	CHROME_CONF=\".nvm/versions/node/*/lib/node_modules/smashtest/node_modules/selenium-webdriver/chrome.js\" && \
	sed -i \$CHROME_CONF -e \"/return.*addArguments.*headless/{s/);/, 'disable-dev-shm-usage', 'no-sandbox');/}\" && \
	mkdir .ssh && \
	chmod 700 .ssh && \
	ssh-keygen -t ecdsa -b 521 -f .ssh/id_ecdsa -q -N \"\" && \
	cp -a .ssh/id_ecdsa.pub .ssh/authorized_keys"

COPY *sh /home/smashtest/

EXPOSE	8022 8080

ENTRYPOINT [ "/home/smashtest/start.sh" ]
