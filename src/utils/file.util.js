const fs = require("fs");
const path = require("path");

const readFile = (fileName) => {
  const filePath = path.join(__dirname, "../../data", fileName);
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
};

const writeFile = (fileName, data) => {
  const filePath = path.join(__dirname, "../../data", fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = { readFile, writeFile };