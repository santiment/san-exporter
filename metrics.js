const { logger } = require('./logger')
const client = require('prom-client')

module.exports.restartCounter = new client.Counter({
    name: 'restart_count',
    help: 'Number of restarts'
});

module.exports.downloadedTransactionsCounter = new client.Counter({
    name: 'downloaded_transactions_count',
    help: 'Number of transactions downloaded'
});

module.exports.downloadedBlocksCounter = new client.Counter({
    name: 'downloaded_blocks_count',
    help: 'Number of blocks downloaded'
});

module.exports.requestsCounter = new client.Counter({
    name: 'requests_made_count',
    help: 'Number of requests made to the node',
    labelNames: ['connection']
});

module.exports.requestsResponseTime = new client.Summary({
    name: 'requests_response_time',
    help: 'The response time of the requests to the node',
    labelNames: ['connection']
});

module.exports.requestsQueueSize = new client.Gauge({
    name: 'requests_queue_size',
    help: 'Number of requests that are in the queue',
    labelNames: ['connection']
});

module.exports.lastExportedBlock = new client.Gauge({
    name: 'last_exported_block',
    help: 'The last block that was saved by the exporter'
});

module.exports.currentBlock = new client.Gauge({
    name: 'current_block',
    help: 'The latest blocks on the blockchain'
});

module.exports.startCollection = function (registry) {
    logger.info(`Starting the collection of metrics, the metrics are available on /metrics`);
    client.collectDefaultMetrics({ registry });
};

module.exports.initRegistry = function () {

    const Registry = client.Registry;
    const register = new Registry();

    return register
};
