const cluster = require('./cluster.js');
cluster.startCluster(() => {
  console.log('hello');
});
