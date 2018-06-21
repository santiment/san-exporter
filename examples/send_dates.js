const pkg = require('../package.json');
const { Exporter } = require('../index')
const exporter = new Exporter(pkg.name)

async function pushData() {
  const timestamp = Math.floor(new Date() / 1000)

  console.log("Sending data...")
  await exporter.sendData({
    timestamp: timestamp,
    iso_date: new Date().toISOString()
  })

  console.log(`Saving position: ${timestamp}`)
  await exporter.savePosition(timestamp)

  setTimeout(pushData, 10000)
}

async function work() {
  await exporter.connect()

  let currentPosition = await exporter.getLastPosition()
  console.log(`Last position: ${currentPosition}`)

  await pushData()
}

work()
