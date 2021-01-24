'use strict';

var FS = require('fs');
var path = require('path');
var Forge = require('node-forge');
var pki = Forge.pki;
var mkdirp = require('mkdirp');
var async = require('async');

var CAattrs = [{
  name: 'commonName',
  value: 'https://github.com/AnanthVivekanand/spotify-adblock-macos'
}, {
  name: 'countryName',
  value: 'spotify-adblock-macos'
}, {
  shortName: 'ST',
  value: 'spotify-adblock-macos'
}, {
  name: 'localityName',
  value: 'spotify-adblock-macos'
}, {
  name: 'organizationName',
  value: 'spotify-adblock-macos'
}, {
  shortName: 'OU',
  value: 'spotify-adblock-macos'
}];

var CAextensions = [{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: true,
  emailProtection: true,
  timeStamping: true
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: true,
  objsign: true,
  sslCA: true,
  emailCA: true,
  objCA: true
}, {
  name: 'subjectKeyIdentifier'
}];

var ServerAttrs = [{
  name: 'countryName',
  value: 'spotify-adblock-macos'
}, {
  shortName: 'ST',
  value: 'spotify-adblock-macos'
}, {
  name: 'localityName',
  value: 'spotify-adblock-macos'
}, {
  name: 'organizationName',
  value: 'spotify-adblock-macos'
}, {
  shortName: 'OU',
  value: 'spotify-adblock-macos'
}];

var ServerExtensions = [{
  name: 'basicConstraints',
  cA: false
}, {
  name: 'keyUsage',
  keyCertSign: false,
  digitalSignature: true,
  nonRepudiation: false,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: false,
  emailProtection: false,
  timeStamping: false
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: false,
  objsign: false,
  sslCA: false,
  emailCA: false,
  objCA: false
}, {
  name: 'subjectKeyIdentifier'
}];

var CA = function () {
};

CA.create = function (caFolder, callback) {
  var ca = new CA();
  ca.baseCAFolder = caFolder;
  ca.certsFolder = path.join(ca.baseCAFolder, 'certs');
  ca.keysFolder = path.join(ca.baseCAFolder, 'keys');
  async.series([
    mkdirp.bind(null, ca.baseCAFolder),
    mkdirp.bind(null, ca.certsFolder),
    mkdirp.bind(null, ca.keysFolder),
    function (callback) {
      FS.exists(path.join(ca.certsFolder, 'ca.crt'), function (exists) {
        if (exists) {
          ca.loadCA(callback);
        } else {
          ca.generateCA(callback);
        }
      });
    }
  ], function (err) {
    if (err) {
      return callback(err);
    }
    return callback(null, ca);
  });
};

CA.prototype.randomSerialNumber = function () {
	// generate random 16 bytes hex string
	var sn = '';
	for (var i=0; i<4; i++) {
		sn += ('00000000' + Math.floor(Math.random()*Math.pow(256, 4)).toString(16)).slice(-8);
	}
	return sn;
}

CA.prototype.generateCA = function (callback) {
  var self = this;
  pki.rsa.generateKeyPair({bits: 2048}, function(err, keys) {
    if (err) {
      return callback(err);
    }
    var cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = self.randomSerialNumber();
    cert.validity.notBefore = new Date();
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1);
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    cert.setSubject(CAattrs);
    cert.setIssuer(CAattrs);
    cert.setExtensions(CAextensions);
    cert.sign(keys.privateKey, Forge.md.sha256.create());
    self.CAcert = cert;
    self.CAkeys = keys;
    async.parallel([
      FS.writeFile.bind(null, path.join(self.certsFolder, 'ca.crt'), pki.certificateToPem(cert)),
      FS.writeFile.bind(null, path.join(self.keysFolder, 'ca.private.key'), pki.privateKeyToPem(keys.privateKey)),
      FS.writeFile.bind(null, path.join(self.keysFolder, 'ca.public.key'), pki.publicKeyToPem(keys.publicKey))
    ], callback);
  });
};

CA.prototype.loadCA = function (callback) {
  var self = this;
  async.auto({
    certPEM: function (callback) {
      FS.readFile(path.join(self.certsFolder, 'ca.crt'), 'utf-8', callback);
    },
    keyPrivatePEM: function (callback) {
      FS.readFile(path.join(self.keysFolder, 'ca.private.key'), 'utf-8', callback);
    },
    keyPublicPEM: function (callback) {
      FS.readFile(path.join(self.keysFolder, 'ca.public.key'), 'utf-8', callback);
    }
  }, function (err, results) {
    if (err) {
      return callback(err);
    }
    self.CAcert = pki.certificateFromPem(results.certPEM);
    self.CAkeys = {
      privateKey: pki.privateKeyFromPem(results.keyPrivatePEM),
      publicKey: pki.publicKeyFromPem(results.keyPublicPEM)
    };
    return callback();
  });
};

CA.prototype.generateServerCertificateKeys = function (hosts, cb) {
  var self = this;
  if (typeof(hosts) === "string") hosts = [hosts];
  var mainHost = hosts[0];
  var keysServer = pki.rsa.generateKeyPair(2048);
  var certServer = pki.createCertificate();
  certServer.publicKey = keysServer.publicKey;
  certServer.serialNumber = this.randomSerialNumber();
  certServer.validity.notBefore = new Date();
  certServer.validity.notBefore.setDate(certServer.validity.notBefore.getDate() - 1);
  certServer.validity.notAfter = new Date();
  certServer.validity.notAfter.setFullYear(certServer.validity.notBefore.getFullYear() + 2);
  var attrsServer = ServerAttrs.slice(0);
  attrsServer.unshift({
    name: 'commonName',
    value: mainHost
  })
  certServer.setSubject(attrsServer);
  certServer.setIssuer(this.CAcert.issuer.attributes);
  certServer.setExtensions(ServerExtensions.concat([{
    name: 'subjectAltName',
    altNames: hosts.map(function(host) {
      if (host.match(/^[\d\.]+$/)) {
        return {type: 7, ip: host};
      }
      return {type: 2, value: host};
    })
  }]));
  certServer.sign(this.CAkeys.privateKey, Forge.md.sha256.create());
  var certPem = pki.certificateToPem(certServer);
  var keyPrivatePem = pki.privateKeyToPem(keysServer.privateKey)
  var keyPublicPem = pki.publicKeyToPem(keysServer.publicKey)
  FS.writeFile(this.certsFolder + '/' + mainHost.replace(/\*/g, '_') + '.crt', certPem, function(error) {
    if (error) console.error("Failed to save certificate to disk in "+self.certsFolder, error);
  });
  FS.writeFile(this.keysFolder + '/' + mainHost.replace(/\*/g, '_') + '.key', keyPrivatePem, function(error) {
    if (error) console.error("Failed to save private key to disk in "+self.keysFolder, error);
  });
  FS.writeFile(this.keysFolder + '/' + mainHost.replace(/\*/g, '_') + '.public.key', keyPublicPem, function(error) {
    if (error) console.error("Failed to save public key to disk in "+self.keysFolder, error);
  });
  // returns synchronously even before files get written to disk
  cb(certPem, keyPrivatePem);
};

CA.prototype.getCACertPath = function () {
  return this.certsFolder + '/ca.crt';
};
module.exports = CA;
