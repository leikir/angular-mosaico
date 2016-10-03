'use strict';


// jQuery helper to communicate with mosaico frame
$.fn.mosaico = function(action, datas) {
  if (!datas) {
    datas = {};
  }
  datas['action'] = action;
  this.get(0).contentWindow.postMessage(JSON.stringify(datas), '*');
};


angular.module('angular-mosaico', [])
  .controller('MosaicoController', ['$scope', function($scope) {
    var rcvmsg = function(evt) {
      evt = JSON.parse(evt.data);
      switch (evt.type) {
        case 'wysiwygLoaded':
          window.dispatchEvent(new Event('mosaicoFrameLoaded'));
          break;
        case 'exportHTML':
          $scope.htmlContentModel = evt.htmlContent;
          $scope.jsonMetadataModel = evt.jsonMetadata;
          $scope.jsonContentModel = evt.jsonContent;
          $scope.$apply();
          $scope.onHtmlExport();
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
  .directive('mosaico', ['$mosaicoProvider', '$sce', function($mosaicoProvider, $sce) {
    return {
      restrict: 'AE',
      scope: {
        editorUrl: '=', //source of mosaico editor
        htmlContentModel: '=', //exported html content
        jsonMetadataModel: '=', //exported JSON metadatas of template
        jsonContentModel: '=', //exported JSON content of template
        defaultJsonMetadata: '=', //default JSON metadata of template to load
        defaultJsonContent: '=', //default JSON content of template to load
        onHtmlExport: '&', //callback to execute when html is exported
        removePreviewFooter: '=' //remove footer with sponsor image when click on preview button
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
            $(iframe).mosaico('init', {
              locale: $mosaicoProvider.locale,
              content: scope.defaultJsonContent,
              metadata: scope.defaultJsonMetadata,
              headers: $mosaicoProvider.httpHeaders,
              removePreviewFooter: scope.removePreviewFooter || $mosaicoProvider.removePreviewFooter
            });
          });
        });
      }
    };
  }])
  .provider('$mosaicoProvider', function() {
    this.$get = function() {
      return {
        locale: 'fr',
        editorUrl: null,
        httpHeaders: null,
        removePreviewFooter: false
      }
    };
  });
