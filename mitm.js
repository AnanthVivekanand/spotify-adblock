var mitm_Proxy = require('http-mitm-proxy');
var mitm_proxy = new mitm_Proxy();
var path = require('path');
var CA = require('./mitm-utils/CA.js');
var net = require('net');
const micromatch = require('micromatch');
const whitelist = require('./mitm-utils/whitelist-mitm.js');
const blacklist = require('./mitm-utils/blacklist-mitm.js');

var colors = require('colors');

process.on('uncaughtException', function (error) {
  console.log(error); // prevents crashing
});

mitm_proxy.onError(function (ctx, err) {
    if (err.code === "ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN") {
      console.log("You haven't installed the generated CA certificate".underline.red);
      process.exit(1);
    }
});

mitm_proxy.onConnect(function(req, socket, head, callback) {
  var host = req.url.split(":")[0];
  var port = req.url.split(":")[1];

  // not the most elegant, but since 
  // spclient.wg.spotify.com is the only url
  // that we need to filter the complete url by
  // we'll just use a simple if statement for now
  if (host == "spclient.wg.spotify.com") {
    return callback();
  }

  // is our host in the whitelist? or it is through port 4070?
  // proxy it through, no questions asked
  else if (micromatch.isMatch(host, whitelist) || port == "4070") {
    console.log(("Allowing: " + host + ", " + port).green);
    var conn = net.connect({
      port: port,
      host: host,
      allowHalfOpen: true
    }, function () {
      conn.on('close', () => {
        conn.end();
      });
      conn.on('finish', () => {
        socket.destroy();
      });
      conn.on('error', function(err) {
        console.log("Error", err);
      });
      socket.on('error', function(err) {
        console.log("Error", err);
      });
      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.pipe(socket);
        socket.pipe(conn);
      })
    });
  } 

  // okay, we have no idea what this is, so
  // handle using blacklist
  else {
    return callback();
  }
});

mitm_proxy.onRequest(function(ctx, callback) {
  // we now have complete access to the url
  let completeUrl = "https://" + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url;

  if (micromatch.isMatch(completeUrl, blacklist)) {
    console.log(("Blocked: " + completeUrl).red);
    ctx.proxyToClientResponse.end(''); // terminate it
  } else {
    console.log(("Allowing: " + completeUrl).green);
    return callback();
  }
});

mitm_proxy.onCertificateRequired = function(hostname, callback) {
  return callback(null, {
    keyFile: path.resolve('./certs/', hostname + '.key'),
    certFile: path.resolve('./certs/', hostname + '.crt')
  });
};

mitm_proxy.onCertificateMissing = function (ctx, files, callback) {
  var hosts = files.hosts || [ctx.hostname];
  CA.generateServerCertificateKeys(hosts, function (cert, private) {
    callback(null, {
      certFileData: cert,
      keyFileData: private,
      hosts: hosts
    });
  });
  return this;
};

mitm_proxy.start = async function(opt) {
  await CA.create(path.resolve(process.cwd(), 'certs'), function (err, ca) {
    if (err) {
      console.log(err);
      return callback(err);
    }
    CA = ca;
  });
  mitm_proxy.listen(opt)
  console.log(("Proxy is up on port " + opt.port).green);
};

mitm_proxy.start({port: 8082});