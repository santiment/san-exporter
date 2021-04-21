const pkg = require('../package.json');
const { Exporter } = require('../index')
const exporter = new Exporter(pkg.name)

async function pushData(num_iteration) {
  let lastPosition = await exporter.getLastPosition()
  console.log(`Last position: ${JSON.stringify(lastPosition)}`)
  const key = lastPosition ? lastPosition.key + 1 : 1

  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)
  console.log("Sending data, iteration", num_iteration);
  await exporter.sendDataWithKey({
    timestamp: timestamp,
    iso_date: now.toISOString(),
    key: key
  }, "key")

  let position = {timestamp: timestamp, key: key}
  console.log(`Saving position: ${JSON.stringify(position)}`)
  await exporter.savePosition(position)

  let newPosition = await exporter.getLastPosition()
  console.log(`New position: ${JSON.stringify(newPosition)}`)
}

async function work() {
  await exporter.connect();
  console.log("Connected to Kafka");

  for (i = 0; i <= 10; i++) {
    await pushData(i)
  }

  exporter.disconnect();
}

work()
