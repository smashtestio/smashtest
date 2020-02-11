# Docker For SmashTest
These files deliver a setup for running SmashTest in [Docker](https://github.com/docker/docker-ce)

These files require that the following programs be installed.
 - [Docker](https://www.docker.com/)
 - [Docker Compose](https://docs.docker.com/compose/)
 - [make](https://www.gnu.org/software/make/)

## Makefile
Contains the Docker commands to build and use the container with little or no Docker experience.

The following **make recipes** are used as arguments given when running the **make** command.
 - ``build`` Builds the Docker image and installs SmashTest, Chrome, Firefox and webdriver-manager
 - ``up`` Starts a container built from the image
 - ``get_key`` Copy the new private SSH key out of the container. Use this to setup a build server to do automatic testing.
 - ``shell`` Connect to a running container with an interactive shell
 - ``status`` Report status of images and containers
 - ``test`` Run the **sample.smash** inside the container
 - ``devel`` Create a new container and start an interactive shell to do development of SmashTest scripts.
 - ``stop`` Shutdown the container
 - ``kill`` Shutdown the container and delete it
 - ``flush`` Ignorently delete all non-running containers and images. **THIS WILL DESTROY ALL DOCKER IMAGES AND CONTAINERS!**

Quickly get up and running my running this command in the same directory as ``docker-compose.yml``
```make
make build test
```
In the Makefile ``test`` calls ``get_key`` and it calls ``up`` so ``make build test`` is all that is needed.

An automated build server will use the private SSH key to upload ``smash`` files and run a smashtest command to test a target web site.

## Dockerfile
This tells Docker how to build the image.

## docker-compose.yml
This provides an elegent way to interact with the container by using a targeted name.

## README.md
You are here!

## sample.smash
Ultra simple 

## start.sh
Start the services for SSH and webdriver-manager.

## test.sh
A simple smashtest command to run ``sample.smash``
