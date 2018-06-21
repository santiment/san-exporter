const zk = require('node-zookeeper-client-async')
const ZOOKEEPER_URL = process.env.ZOOKEEPER_URL || "localhost:2181"
const zookeeperClient = zk.createAsyncClient(ZOOKEEPER_URL)

const KAFKA_MAX_EVENTS_TO_SENT = parseInt(process.env.KAFKA_MAX_EVENTS_TO_SENT || "10000")
const KAFKA_URL = process.env.KAFKA_URL || "localhost:9092"
const kafka = require('kafka-node')

process.on('unhandledRejection', (reason, p) => {
  // Otherwise unhandled promises are not possible to trace with the information logged
  console.error('Unhandled Rejection at: ', p, 'reason:', reason, 'error stack:', reason.stack);
  process.exit(1)
});

exports.Exporter = class {
  constructor(exporter_name) {
    this.exporter_name = exporter_name
  }

  get topic_name() {
    return this.exporter_name.replace("-exporter", "").replace("-", "_")
  }

  get zookeeperPositionNode() {
    return `/${this.exporter_name}/${this.topic_name}/block-number`
  }

  async connect() {
    console.log(`Connecting to zookeeper host ${ZOOKEEPER_URL}`)
    await zookeeperClient.connectAsync()

    const kafkaClient = new kafka.KafkaClient({kafkaHost: KAFKA_URL})
    this.producer = new kafka.HighLevelProducer(kafkaClient)

    console.info(`Connecting to kafka host ${KAFKA_URL}`)
    return new Promise((resolve, reject) => {
      this.producer.on("ready", resolve)
      this.producer.on("error", reject)
    })
  }

  async getLastPosition() {
    if (await zookeeperClient.existsAsync(this.zookeeperPositionNode)) {
      const previousBlockNumber = await zookeeperClient.getDataAsync(this.zookeeperPositionNode)
      return previousBlockNumber.data.readUInt32BE(0)
    } else {
      return null
    }
  }

  async savePosition(position) {
    const newNodeValue = Buffer.alloc(4)
    newNodeValue.writeUInt32BE(position)

    if (await zookeeperClient.existsAsync(this.zookeeperPositionNode)) {
      return zookeeperClient.setDataAsync(this.zookeeperPositionNode, newNodeValue)
    } else {
      return zookeeperClient.mkdirpAsync(this.zookeeperPositionNode, newNodeValue)
    }
  }

  async sendData(events) {
    if (events.constructor !== Array) {
      events = [events]
    }

    events = events.map((event) => typeof(event) === "object" ? JSON.stringify(event) : event)

    for (let i = 0; i < events.length;i += KAFKA_MAX_EVENTS_TO_SENT) {
      await new Promise((resolve, reject) => {
        this.producer.send([{
          topic: this.topic_name,
          messages: events.slice(i, i + KAFKA_MAX_EVENTS_TO_SENT),
          attributes: 1
        }], (err, data) => {
          if (err) return reject(err)
          resolve(data)
        })
      });
    }

    return true;
  }
}
