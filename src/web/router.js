const cluster = require('./cluster.js');
cluster.startCluster(() => {
  console.log('hello');
});
setTimeout(() => {
  cluster.restartWorkers()
}, 2000);
