const httpProxy = require("http-proxy");
const http = require("http");
const url = require("url");
const net = require('net');
const micromatch = require('micromatch');
const whitelist = require("./filter-domains-utils/whitelist.js");
const chalk = require('chalk');

const server = http.createServer((req, res) => {
	let urlObj = url.parse(req.url);
	let target = urlObj.protocol + "//" + urlObj.host;

	console.log("Proxy HTTP request for:", target);

	let proxy = httpProxy.createProxyServer({});
	proxy.on("error", (err, req, res) => {
		console.log("proxy error", err);
		res.end();
	});

	proxy.web(req, res, { target: target });
}).listen(process.env.PORT || 8080);  //this is the port your clients will connect to
console.log(chalk.green(`Proxy server listening on port ${process.env.PORT || 8080}`))

const regex_hostport = /^([^:]+)(:([0-9]+))?$/;

const getHostPortFromString = (hostString, defaultPort) => {
	let host = hostString;
	let port = defaultPort;

	let result = regex_hostport.exec(hostString);
	if (result != null) {
		host = result[1];
		if (result[2] != null) {
			port = result[3];
		}
	}

	return ([host, port]);
};

server.addListener('connect', (req, socket, bodyhead) => {
	let hostPort = getHostPortFromString(req.url, 443);
	let hostDomain = hostPort[0];
	if (!micromatch.isMatch(hostDomain, whitelist)) {
		console.log(chalk.red("Blocking: " + hostDomain));
		return;
	}
	let port = parseInt(hostPort[1]);
	console.log(chalk.green("Proxying HTTPS request for:", hostDomain, port));

	let proxySocket = new net.Socket();
	proxySocket.connect(port, hostDomain, () => {
		proxySocket.write(bodyhead);
		socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
	}
	);

	proxySocket.on('data', (chunk) => {
		socket.write(chunk);
	});

	proxySocket.on('end', () => {
		socket.end();
	});

	proxySocket.on('error', () => {
		socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
		socket.end();
	});

	socket.on('data', (chunk) => {
		proxySocket.write(chunk);
	});

	socket.on('end', () => {
		proxySocket.end();
	});

	socket.on('error', () => {
		proxySocket.end();
	});
});
