import {
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import fetch from "node-fetch";

BigInt.prototype.toJSON = function () {
  return parseFloat(this.toString());
};

export const get = async (req, res) => {
  const startTime = Date.now();
  const { interval, bucketCount } = req.query;
  const allowedIntervals = ["30m", "1h", "6h", "12h", "1d", "7d", "30d", "90d"];
  if (!allowedIntervals.includes(interval)) {
    return res.status(400).json({
      error: "Invalid interval",
    });
  }

  const bucketCountInt = parseInt(bucketCount);
  if (
    isNaN(bucketCountInt) ||
    bucketCountInt < 1 ||
    bucketCountInt > 150 ||
    !Number.isInteger(bucketCountInt)
  ) {
    return res.status(400).json({
      error: "Invalid bucketCount",
    });
  }

  const serviceId = req.params.serviceId;

  if (!existsSync("__cache")) {
    mkdirSync("__cache");
  }

  const cacheFile = join(
    "__cache",
    `${serviceId}$${interval}$${bucketCount}.json`
  );

  if (existsSync(cacheFile)) {
    const cacheData = JSON.parse(readFileSync(cacheFile, "utf-8"));
    const cacheTime = new Date(cacheData.timestamp);
    if (Date.now() - cacheTime.getTime() < 60 * 1000 * 5) {
      return res.json(cacheData);
    } else {
      unlinkSync(cacheFile);
    }
  }

  try {
    const apiResponse = await fetch(
      `https://worker-status.jackcrane.workers.dev/serviceId/${serviceId}?interval=${interval}&bucketCount=${bucketCount}`
    );
    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const responseData = await apiResponse.json();
    responseData.timestamp = new Date().toISOString();
    writeFileSync("query.sql", responseData.query);
    delete responseData.query;
    writeFileSync(cacheFile, JSON.stringify(responseData, null, 2));

    res.json(responseData);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};
