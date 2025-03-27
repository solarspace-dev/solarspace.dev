# Deployment

The solar spaces app is containerized and deployed to a Digital Ocean droplet.
Most of the deployment process is handled via a GitHub actions, and only minimal setup is required.

## Configuring the droplet

There are some basic setup steps that must be executed manually after creating the droplet.

https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-22-04

After that, we can prepare the Droplet for use with Docker

https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04



https://www.digitalocean.com/community/tutorials/how-to-secure-a-containerized-node-js-application-with-nginx-let-s-encrypt-and-docker-compose