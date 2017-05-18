'use strict';

var promises = {};
var nextPromiseId = 0;

// jQuery helper to communicate with mosaico frame
$.fn.mosaico = function(action, datas) {
  if (!datas) {
    datas = {};
  }
  datas.action = action;

  // create a promise
  var deferred = $.Deferred();

  // choose an ID for it
  var promiseId = 0 + nextPromiseId;
  nextPromiseId++;

  // store the ID in the message data so that we get it in response
  datas.promiseId = promiseId;

  // create the promise and store it in promises
  promises[promiseId] = deferred;

  // send the message
  this.get(0).contentWindow.postMessage(JSON.stringify(datas), '*');

  // return callback-only object for the promise
  return deferred.promise();
};

angular.module('angular-mosaico', [])
  .controller('MosaicoController', ['$scope', function($scope) {
    var rcvmsg = function(evt) {
      // extract message data
      var data = JSON.parse(evt.data);

      // find the related promise
      var deferred = promises[data.promiseId];

      switch (data.type) {

        case 'wysiwygLoaded':
          // dispatch the event
          var evt;
          if (typeof(window.Event) === "function") {
            evt = new Event('mosaicoFrameLoaded');
          }
          else {
            evt = document.createEvent('Event');
            evt.initEvent('mosaicoFrameLoaded', true, false);
          }
          window.dispatchEvent(evt);

          // resolve the promise if exists
          if (deferred) {
            deferred.resolve();
          }

          // done
          break;

        case 'exportHTML':
          // dispatch the result
          $scope.htmlContentModel = data.htmlContent;
          $scope.jsonMetadataModel = data.jsonMetadata;
          $scope.jsonContentModel = data.jsonContent;
          $scope.$apply();

          // resolve the promise if exists
          if (deferred) {
            deferred.resolve();
          }

          // done
          break;
      }
    };

    if (window.addEventListener) {
      window.addEventListener('message', rcvmsg, false);
    } else {
      window.attachEvent('onmessage', rcvmsg);
    }

    $scope.$on('$destroy', function() {
      if (window.addEventListener) {
        window.removeEventListener('message', rcvmsg);
      }
      else {
        window.detachEvent('message', rcvmsg);
      }
    })
  }])
  .provider('$mosaico', function() {

    this.locale = 'fr';
    this.editorUrl = null;
    this.httpHeaders = null;
    this.removePreviewFooter = false;
    this.plugins = null;
    this.options = null;

    this.setLocale = function(locale) {
      this.locale = locale;
    };

    this.setEditorUrl = function(url) {
      this.editorUrl = url;
    };

    this.setHttpHeaders = function(headers) {
      this.httpHeaders = headers;
    };

    this.setRemovePreviewFooter = function(previewFooter) {
      this.removePreviewFooter = previewFooter;
    };

    this.setPlugins = function(plugins) {
      this.plugins = plugins;
    };

    this.setOptions = function(options) {
      this.options = options;
    };

    this.$get = function() {
      return this;
    };
  })
  .directive('mosaico', ['$mosaico', '$sce', function($mosaicoProvider, $sce) {
    return {
      restrict: 'AE',
      scope: {
        editorUrl: '=', //source of mosaico editor
        htmlContentModel: '=', //exported html content
        jsonMetadataModel: '=', //exported JSON metadatas of template
        jsonContentModel: '=', //exported JSON content of template
        defaultJsonMetadata: '=', //default JSON metadata of template to load
        defaultJsonContent: '=', //default JSON content of template to load
        removePreviewFooter: '=', //remove footer with sponsor image when click on preview button
        plugins: '=', //plugins like tinymce or basic mosaico plugin
        options: '=' //window mosaico options
      },
      controller: 'MosaicoController',
      link: function(scope, elem, attrs) {

        elem.ready(function() {
          var iframe = document.createElement('iframe');
          var frameSource = scope.editorUrl || $mosaicoProvider.editorUrl;
          if (!frameSource) {
            console.warn('No source specified for frame');
            return;
          }
          frameSource = $sce.trustAsResourceUrl(frameSource);
          iframe.src = frameSource;
          elem.append(iframe);
          iframe.style.width = "100%";
          iframe.style.height = "700px";
          $(iframe).on('load', function() {
            var plugins = scope.plugins || $mosaicoProvider.plugins;
            if (jQuery.isFunction(plugins)) {
              plugins = (plugins)();
            }
            $(iframe).mosaico('init', {
              locale: $mosaicoProvider.locale,
              content: scope.defaultJsonContent,
              metadata: scope.defaultJsonMetadata,
              headers: $mosaicoProvider.httpHeaders,
              removePreviewFooter: scope.removePreviewFooter || $mosaicoProvider.removePreviewFooter,
              plugins: plugins,
              options: scope.options || $mosaicoProvider.options,
            });
          });
        });
      }
    };
  }]);
