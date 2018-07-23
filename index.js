const Kafka = require('node-rdkafka')
const zk = require('node-zookeeper-client-async')

const ZOOKEEPER_URL = process.env.ZOOKEEPER_URL || "localhost:2181"
const zookeeperClient = zk.createAsyncClient(ZOOKEEPER_URL)

const KAFKA_COMPRESSION_CODEC = process.env.KAFKA_COMPRESSION_CODEC || "lz4"
const KAFKA_URL = process.env.KAFKA_URL || "localhost:9092"
const FLUSH_TIMEOUT = 5000

const FORMAT_HEADER = 'format=json;'

process.on('unhandledRejection', (reason, p) => {
  // Otherwise unhandled promises are not possible to trace with the information logged
  console.error('Unhandled Rejection at: ', p, 'reason:', reason, 'error stack:', reason.stack)
  process.exit(1)
})

exports.Exporter = class {
  constructor(exporter_name) {
    this.exporter_name = exporter_name
    this.producer = new Kafka.Producer({
      'metadata.broker.list': KAFKA_URL,
      'client.id': this.exporter_name,
      'compression.codec': KAFKA_COMPRESSION_CODEC
    })
  }

  get topic_name() {
    return process.env.KAFKA_TOPIC || this.exporter_name.replace("-exporter", "").replace("-", "_")
  }

  get zookeeperPositionNode() {
    return `/${this.exporter_name}/${this.topic_name}/block-number`
  }

  async connect() {
    console.log(`Connecting to zookeeper host ${ZOOKEEPER_URL}`)
    await zookeeperClient.connectAsync()

    console.info(`Connecting to kafka host ${KAFKA_URL}`)
    this.producer.connect()
    return new Promise((resolve, reject) => {
      this.producer.on("ready", resolve)
      this.producer.on("event.error", reject)
    })
  }

  async getLastPosition() {
    if (await zookeeperClient.existsAsync(this.zookeeperPositionNode)) {
      const previousBlockNumber = await zookeeperClient.getDataAsync(this.zookeeperPositionNode)

      try {
        if (Buffer.isBuffer(previousBlockNumber && previousBlockNumber.data)) {
          const value = previousBlockNumber.data.toString('utf8')

          if (value.startsWith(FORMAT_HEADER)) {
            return JSON.parse(value.replace(FORMAT_HEADER, ''))
          } else {
            return previousBlockNumber.data.readUInt32BE(0)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    return null
  }

  async savePosition(position) {
    if (typeof position !== 'undefined') {
      const newNodeValue = Buffer.from(FORMAT_HEADER + JSON.stringify(position), 'utf-8')

      if (await zookeeperClient.existsAsync(this.zookeeperPositionNode)) {
        return zookeeperClient.setDataAsync(this.zookeeperPositionNode, newNodeValue)
      } else {
        return zookeeperClient.mkdirpAsync(this.zookeeperPositionNode, newNodeValue)
      }
    }
  }

  async sendData(events) {
    if (events.constructor !== Array) {
      events = [events]
    }

    events = events.map((event) => typeof(event) === "object" ? JSON.stringify(event) : event)
    events.forEach((event) => {
      this.producer.produce(this.topic_name, null, Buffer.from(event))
    })

    return new Promise((resolve, reject) =>
      this.producer.flush(FLUSH_TIMEOUT, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    )
  }
}
