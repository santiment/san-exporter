const pkg = require('../package.json');
const { Exporter } = require('../index')
const exporter = new Exporter(pkg.name)

async function pushData(num_iteration) {
  const timestamp = Math.floor(new Date() / 1000)

  let lastPosition = await exporter.getLastPosition()
  console.log(`Last position: ${JSON.stringify(lastPosition)}`)
  let key = 1
  if(lastPosition) {
    key = lastPosition.key + 1
  }

  console.log("Sending data, iteration", num_iteration);
  await exporter.sendDataWithKey({
    timestamp: timestamp,
    iso_date: new Date().toISOString(),
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
