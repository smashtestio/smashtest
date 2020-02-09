FROM debian:buster
WORKDIR /

	# wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
	# apt-get -y install ./google-chrome-stable_current_amd64.deb && \

RUN apt-get -y update && \
	apt-get -y install npm curl openjdk-11-jre openjdk-11-jdk && \	
	curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh > install.sh && \
	echo '972c2b83fb0db7c3a1481bc982db7b1bfe7deae620514b94598b061b6a864baf  install.sh' | /usr/bin/sha256sum -c - && \
	bash ./install.sh && \
	export NVM_DIR="$HOME/.nvm" && \
	[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
	nvm install 9 && \
	npm install -g webdriver-manager && \
	webdriver-manager update && \
	npm install -g smashtest && \
	apt-get -y install chromium bash && \
	printf "\ndeb http://downloads.sourceforge.net/project/ubuntuzilla/mozilla/apt all main" >> /etc/apt/sources.list && \
	apt-key adv --keyserver keyserver.ubuntu.com --recv-keys CCC158AFC1289A29 && \
	apt-get update && \
	apt-get -y install firefox-mozilla-build

EXPOSE	8080

ENTRYPOINT [ "webdriver-manager start & npm", "start" ]

