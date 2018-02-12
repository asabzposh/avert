# Avert
[![Coverage Status](https://coveralls.io/repos/github/asabzposh/avert/badge.svg?branch=master)](https://coveralls.io/github/asabzposh/avert?branch=master) [![Build Status](https://travis-ci.org/asabzposh/avert.svg?branch=master)](https://travis-ci.org/asabzposh/avert)

A Hapi v17+ plugin to sanitize a route query, payload and params. This was heavily inspired by Disinfect (https://github.com/genediazjr/disinfect). Motivation for this plugin came about as Disinfect was not v17+ compatible.

The plugin can be used:
* at server level.
* at route level.
* disabled at route level.

## Usage:

    await server.register({ 
      plugin: require('avert'), 
      options: {
        // boolean parameters
        removeWhitespace: true,
        removeNonExistent: true,
        removeDollarSign: true,
        escapeDollarSign: false,
        removeCurlyBracket: false,
        escapeCurlyBracket: true,

        avertQuery: true,
        avertParams: true,
        avertPayload: true,

        // function parameters
        genericCustomSanitizer: function() {},
        queryCustomSanitizer: function() {},
        paramCustomSanitizer: function() {},
        payloadCustomSanitizer: function() {}
      } 
    });

Any of the options can be disregarded. Also, we can either '''removeDollarSign''' or '''escapeDollarSign'''. Not both. If both are set to true, then "remove" takes precedence. Same logic applies for Curly Brackets.

## Order of action:

    request object -> sanitize -> generic sanitizer function -> query, params and/or payload specific sanitizer function -> (if true) remove white space -> (if true) remove null -> (if true) remove dollar sign OR escape dollar sign -> (if true) remove curly or escape curly brackets -> sanitized object returned.

Custom sanitizer function(s) needs to return a sanitized object as final result.

## To disable on a specific route:

      server.route({
          method: 'GET',
          path: '/disabled',
          handler: (request, h) => {

              return request.query;
          },
          options: {
              plugins: {
                  avert: false
              }
          }
      });
      
To use the plugin on a specific route:

      server.route({
          method: 'GET',
          path: '/queryTestPerRoute',
          handler: (request, h) => {

              return request.query;
          },
          options: {
              plugins: {
                  avert: {
                      removeNonExistent: true
                  }
              }
          }
      });
      
## Contribution:
* Please include 100% test coverage.
* Please follow [Hapi coding conventions](https://hapijs.com/styleguide).
* Submit an issue first for signiticant changes.

## Inspiration:
* [NoSQL Injection attack wiki](https://www.owasp.org/index.php/Testing_for_NoSQL_injection)
* [disinfect](https://github.com/genediazjr/disinfect) - The original Hapi sanitizer.

