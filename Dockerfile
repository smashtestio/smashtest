FROM debian:buster
WORKDIR /

RUN 	apt-get -y update && \
	


ENTRYPOINT [ "npm", "start" ]

