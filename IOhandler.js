const fs = require("fs");
const PNG = require("pngjs").PNG;
const path = require("path");
const yauzl = require("yauzl-promise");

/**
 * Description: decompress file from given pathIn, write to given pathOut
 *
 * @param {string} pathIn
 * @param {string} pathOut
 * @return {promise}
 */
const unzip = async (pathIn, pathOut) => {
  const unzippedDir = path.join(pathOut, "unzipped");

  // Create the 'unzipped' directory if it doesn't exist
  await fs.promises.mkdir(unzippedDir, { recursive: true });

  try {
    // Open the zip file
    const zipFile = await yauzl.open(pathIn);

    // Loop through all entries in the zip file
    for (const entry of await zipFile.readEntries()) {
      const entryPath = path.join(unzippedDir, entry.fileName);

      if (entry.fileName.endsWith("/")) {
        // It's a directory, so create it
        await fs.promises.mkdir(entryPath, { recursive: true });
      } else {
        // It's a file, so extract it
        const readStream = await entry.openReadStream();
        await fs.promises.mkdir(path.dirname(entryPath), { recursive: true });
        const writeStream = fs.createWriteStream(entryPath);

        // Pipe the stream and wait for it to finish
        await new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          readStream.on("end", resolve);
          readStream.on("error", reject);
        });
      }
    }

    console.log("Extraction operation complete");
  } catch (err) {
    console.error("Error during extraction:", err);
  }
};


/**
 * Description: read all the png files from given directory and return Promise containing array of each png file path
 *
 * @param {string} path
 * @return {promise}
 */
const readDir = (dir) => {
  return fs.promises.readdir(dir)
    .then(files => files.filter(file => file.endsWith(".png")).map(file => path.join(dir, file)));
};


/**
 * Description: Read in png file by given pathIn,
 * convert to grayscale and write to given pathOut
 *
 * @param {string} filePath
 * @param {string} pathProcessed
 * @return {promise}
 */
const grayScale = (pathIn, pathOut) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(pathIn)
      .pipe(new PNG())
      .on("parsed", function () {
        for (let i = 0; i < this.data.length; i+= 4) {
          const avg = (this.data[i] + this.data[i + 1] + this.data[i + 2]) / 3;
          thiss.data[i] = this.data[i + 1] = this.data[i + 2] = avg;
        }

        this.pack().pipe(fs.createWriteStream(pathout))
          .on("finish", resolve)
          .on("error", reject);
      })
      .on("error", reject);
  });
};

/**
 * Description: Main function that coordinates the process: unzip, read PNG files, grayscale images
 *
 * @param {string} zipFilePath
 * @param {string} pathUnzipped
 * @param {string} pathProcessed
 * @return {Promise}
 */
const startProcess = (zipFilePath, pathUnzipped, pathProcessed) => {
  return unzip(zipFilePath, pathUnzipped)
    .then(() => readDir(pathUnzipped))
    .then((pngFiles) => {
      const processingPromises = pngFiles.map((filePath) => {
        const fileName = path.basename(filePath);
        const outputPath = path.join(pathProcessed, fileName);
        return grayScale(filePath, outputPath);
      });
      return Promise.all(processingPromises);
    })
    .then(() => {
      console.log("Extraction and Grayscale processing complete!");
    })
    .catch((err) => {
      console.error("Error during processing:", err);
    });
};

module.exports = {
  unzip,
  readDir,
  grayScale,
  startProcess,
};
