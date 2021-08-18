# Spotify Desktop Adblocker

This project uses a proxy to strip all ad-related requests from the Spotify desktop application. This should 
work for all major operating systems, but if you are using Linux, I would advise you to use [this](https://github.com/abba23/spotify-adblock-linux) instead.  

## Instructions

Open Spotify desktop, open the dropdown from the top-right, and open settings. Scroll all the way down settings and find "Proxy" (you may need
to look under Advanced Settings).

Configure it as shown:

![Proxy config](https://i.imgur.com/TaEWjkB.png)


Run the following commands in terminal to clone and install. 
```
> git clone https://github.com/AnanthVivekanand/spotify-adblock.git && cd spotify-adblock
...
> npm i
...
> export PORT=8080

> npm start
```

Great, your proxy server for Spotify is now working! You should be seeing: 

![Working](https://i.imgur.com/ASJKLwc.png)

However, if Spotify is loading but no songs are playing, you may be experiencing [issue #14](https://github.com/AnanthVivekanand/spotify-adblock/issues/14). In this case, use MITM support below. 

# MITM support

Simply run `node mitm.js` and set the spotify proxy settings to port 8082.

Then start the proxy, which allows it to generate some certificates. Then, trust the 
root certificate at `certs/certs/ca.crt`

On MacOS, you can trust the root certficate with one command: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/certs/ca.crt`

This should be perfectly safe.

# Docker image

To build an image for the MITM proxy, simply run `npm run docker-mitm`, and then create a container binding the port 8082 and the folder `/usr/src/app/certs` to the host to get access to the certificates.
The port 8082 is exposed by Docker for easier setup using a reverse-proxy.

For example:

```docker run -d --name=Spotify-adblock --volume=/opt/spotify-adblock/certs:/usr/src/app/certs -p 8082:8082 --restart=always spotify-adblock:latest```

,where /opt/spotify-adblock/certs is the path on the host machine where you will find the certificates you need to import.
