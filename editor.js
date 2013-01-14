require.config({
    paths: {
      underscore: 'lib/underscore-min',
      eventable: 'lib/eventable',
      eventcontainer: 'lib/eventcontainer',
      hammer: 'lib/hammer',
      commons: 'engine/commons',
      jquery: 'lib/jquery',
      'bootstrap': 'lib/bootstrap/js/bootstrap'
    }
});
require(['editor/main'], function() { })
