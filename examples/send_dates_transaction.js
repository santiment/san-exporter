const pkg = require('../package.json');
const { Exporter } = require('../index')
const exporter = new Exporter(pkg.name, true)

async function pushData() {
  let lastPosition = await exporter.getLastPosition()
  console.log(`Last position: ${JSON.stringify(lastPosition)}`)
  const key = lastPosition ? lastPosition.key + 1 : 1

  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)
  console.log("Sending data with transaction...")
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
  console.log("Start sending data with transactions.");
  await exporter.connect();
  exporter.initTransactions();
  exporter.beginTransaction();

  for (i = 0; i <= 10; i++) {
    await pushData()
  }

  exporter.commitTransaction();
  exporter.disconnect();
}

work()
