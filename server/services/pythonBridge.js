import axios from "axios";

function baseUrl() {
  return process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
}

function client() {
  return axios.create({ baseURL: baseUrl(), timeout: 20000 });
}

let cachedSchema = null;

export async function getSchema() {
  // TODO: If cachedSchema exists, return it.
  // TODO: Otherwise, GET "/schema" from the client, cache the data, and return it.
  return null;
}

export async function predictRisk(features) {
  // TODO: POST "/predict" with the features payload using the client, and return the data.
  return null;
}
