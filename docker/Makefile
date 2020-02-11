up: ## Spin up the container
	docker-compose -p SmashTest up -d

stop: ## Stop running containers
	docker-compose -p SmashTest stop

kill: ## Stop and remove all containers
	docker-compose -p SmashTest down

build: ## Rebuild the image
	docker image build -t smashtestio .

get_key:
	docker cp $(shell docker-compose ps -q SmashTest):/root/.ssh/id_ecdsa ./docker-private-key-id_ecdsa

shell: ## Start the container with a command prompt
	docker exec -it $(shell docker-compose ps -q SmashTest) bash

devel: ## Start up a new container from the image and open a shell
	docker run --entrypoint bash -it smashtestio

status:## Show status of containers and images
	docker ps -a
	docker images -a	

test:
	ssh root@localhost -p 8022 -i ./docker-private-key-id_ecdsa -oStrictHostKeyChecking=no -oUserKnownHostsFile=/dev/null /test.sh

flush: ## Remove local images and containers !!!DANGER!!! everything gets deleted
	-$(MAKE) kill	
	-docker rm $(shell docker ps -a -q)
	-docker rmi $(shell docker images -a -q)
