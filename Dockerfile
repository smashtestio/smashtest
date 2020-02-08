FROM debian:buster
WORKDIR /

	# wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
	# apt-get -y install ./google-chrome-stable_current_amd64.deb && \

RUN apt-get -y update && \
	apt-get -y install npm && \
	npm install && \
	npm install -g webdriver-manager && \
	npm install -g smashtest && \
	apt-get -y install chromium snapd && \
	snap install firefox


EXPOSE	8080


# ENTRYPOINT [ "npm", "start" ]

