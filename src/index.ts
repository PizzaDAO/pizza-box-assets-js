import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'

const boxAttributesCsv = '../data/input/box-attributes.csv'
const ipfsLinksCsv = '../data/input/ipfs-links.csv'
const outputDir = '../data/output'
const filenameTemplate = 'rare-pizza-box-metadata-#index.json'

const metadataTemplate = {
  name: 'Rare Box',
  description: "What's in the box you ask?  Something delicious, amore.",
  image: '',
  attributes: [],
}

const boxAttributes: { value: string }[][] = []
const imageUris: string[] = []

const main = async () => {
  const streamToPromise = async (stream: NodeJS.ReadWriteStream) => {
    return new Promise((resolve, reject) => {
      stream.on('error', () => reject(new Error('Something went wrong while reading stream...')))
      stream.on('end', () => resolve(stream))
    })
  }

  const readBoxAttributes$ = fs
    .createReadStream(path.resolve(__dirname, boxAttributesCsv))
    .pipe(csv())
    .on('data', (rowData) => {
      delete rowData.Index

      const attributes = Object.keys(rowData)
        .filter((key) => rowData[key].trim().toLowerCase() === 'x')
        .map((attribute) => ({ value: attribute }))

      boxAttributes.push(attributes)
    })

  const readIpfsLinks$ = fs
    .createReadStream(path.resolve(__dirname, ipfsLinksCsv))
    .pipe(csv())
    .on('data', ({ pinataURI }) => {
      imageUris.push(pinataURI)
    })

  await Promise.all([streamToPromise(readBoxAttributes$), streamToPromise(readIpfsLinks$)])

  const metadataBlobs = new Array(boxAttributes.length).fill(undefined)

  const output = metadataBlobs.map((_, index) => ({
    ...metadataTemplate,
    image: imageUris[index],
    attributes: boxAttributes[index],
  }))

  for (const [index, blob] of output.entries()) {
    fs.writeFileSync(
      path.resolve(__dirname, path.join(outputDir, filenameTemplate.replace('#index', `${index}`))),
      JSON.stringify(blob),
    )
  }
}

main()
  .then(() => console.log('Box metadata exported!'))
  .catch((err) => console.log({ err }))
